import _ from "lodash";
import { onSearch } from "../../utils/protocolApis/index.js";
import ContextFactory from "../../factories/ContextFactory.js";
import BppSearchService from "./bppSearch.service.js";
import { CITY_CODE } from "../../utils/cityCode.js";
import { CATEGORIES } from "../../utils/categories.js";
import createPeriod from "date-period";
import translateObject from "../../utils/bhashini/translate.js";
import { OBJECT_TYPE } from "../../utils/constants.js";
// import logger from "../lib/logger";
const bppSearchService = new BppSearchService();
import client from "../../database/elasticSearch.js";
import moment from 'moment-timezone';
import BadRequestParameterError from "../../lib/errors/bad-request-parameter.error.js";
class SearchService {
  isBppFilterSpecified(context = {}) {
    return typeof context.bpp_id !== "undefined";
  }

  // Helper functions
  buildSortQuery(searchRequest) {
    const validSortFields = ['price', 'quantity', 'rating'];
    if (searchRequest.sortField && validSortFields.includes(searchRequest.sortField)) {
      return [{ [`item_details.${searchRequest.sortField}.value`]: { order: searchRequest.sortOrder || 'asc' } }];
    } 
    return undefined;
  }

  async processResults(hits, targetLanguage) {
    return Promise.all(hits.map(async (hit) => {
      const item = hit._source;
      item.customisation_items = await this.fetchCustomizationItems(item, targetLanguage);
      item.related_items = await this.fetchRelatedItems(item, targetLanguage);
      item.attributes = this.flattenAttributes(item.attribute_key_values);
      item.locations = item.location_details ? [item.location_details] : [];
      return item;
    }));
  }

  async fetchCustomizationItems(item, targetLanguage) {
    if (!Array.isArray(item?.customisation_groups) || item.customisation_groups.length === 0) return [];
    const groupIds = item.customisation_groups.map((data) => data?.id).filter(Boolean);
      if (groupIds.length === 0) return [];
        const customisationQuery = {
          bool: {
            must: [
              { terms: { customisation_group_id: groupIds } },
              { match: { type: "customization" } },
              { match: { language: targetLanguage } }
            ]
          }
        };
      const customisationResults = await client.search({ query: customisationQuery, size: 100 });
      return customisationResults.hits.hits.map((customHit) => customHit._source || {});
  }

  async fetchRelatedItems(item, targetLanguage) {
    if (!item?.item_details?.parent_item_id) return [];
    const relatedQuery = {
        bool: {
          must: [
            { match: { language: targetLanguage } },
            { match: { "item_details.parent_item_id": item.item_details.parent_item_id } },
            { match: { "provider_details.id": item.provider_details?.id } },
            { match: { "location_details.id": item.location_details?.id } }
          ]
        }
    };
    const relatedResults = await client.search({ query: relatedQuery, size: 100 });
    return relatedResults.hits.hits.map((relatedHit) => {
      const data = relatedHit._source || {};
      data.attributes = this.flattenAttributes(data.attribute_key_values);
      return data;
    });
  }

  flattenAttributes(attributeKeyValues) {
    if (!Array.isArray(attributeKeyValues)) return {};
    return attributeKeyValues.reduce((acc, pair) => {
      if (pair?.key && pair?.value) acc[pair.key] = pair.value;
      return acc;
    }, {});
  }


  // async search(searchRequest = {}, targetLanguage = "en") {
  //   try {
  //     let matchQuery = [];
  //     let filterQuery = [];
  
  //     // // Basic matches for language and time labels
  //     // matchQuery.push({ match: { language: targetLanguage } });
  //     // matchQuery.push({ match: { "item_details.time.label": 'enable' } });
  //     // matchQuery.push({ terms: { "location_details.time.label": ['enable', 'open'] } });
  //     // matchQuery.push({ match: { "provider_details.time.label": 'enable' } });

  //     // Add static filters
  //     filterQuery.push(
  //       { term: { language: targetLanguage } },
  //       { term: { "item_details.time.label": 'enable' } },
  //       { terms: { "location_details.time.label": ['enable', 'open'] } },
  //       { term: { "provider_details.time.label": 'enable' } },
  //       { term: { is_first: true } }
  //     );


  //     // Handle search by item name
  //     if (searchRequest.name) {
  //       matchQuery.push({
  //         bool: {
  //           should: [
  //             { match_phrase: { "item_details.descriptor.name": { query: searchRequest.name, slop: 1, boost: 4 } } },
  //             { match: { "item_details.descriptor.name": { query: searchRequest.name, fuzziness: "AUTO", prefix_length: 2, operator: "OR", boost: 2 } } }
  //           ],
  //           minimum_should_match: 1
  //         }
  //       });
  //     }
  
  //     // Handle filters for provider, location, and category IDs
  //     const providerIds = searchRequest.providerIds ? searchRequest.providerIds.split(',') : [];
  //     const locationIds = searchRequest.locationIds ? searchRequest.locationIds.split(',') : [];
  //     const categoryIds = searchRequest.categoryIds ? searchRequest.categoryIds.split(',') : [];
  //     if (providerIds.length > 0) filterQuery.push({ terms: { "provider_details.id": providerIds } });
  //     if (locationIds.length > 0) filterQuery.push({ terms: { "location_details.id": locationIds } });
  //     if (categoryIds.length > 0) filterQuery.push({ terms: { "item_details.category_id": categoryIds } });
  
  //     // // Filter by provider IDs, location IDs, and category IDs
  //     // if (searchRequest.providerIds) {
  //     //   matchQuery.push({ terms: { "provider_details.id": searchRequest.providerIds.split(',') } });
  //     // }
  //     // if (searchRequest.locationIds) {
  //     //   matchQuery.push({ terms: { "location_details.id": searchRequest.locationIds.split(',') } });
  //     // }
  //     // if (searchRequest.categoryIds) {
  //     //   matchQuery.push({ terms: { "item_details.category_id": searchRequest.categoryIds.split(',') } });
  //     // }
  
  //     // Handle dynamic product attributes (e.g., Brand, Size, Color)
  //     // const attributeQueries = [];
  //     // for (const [key, value] of Object.entries(searchRequest)) {
  //     //   if (key.startsWith('product_attr_')) {
  //     //     const attributeName = key.slice('product_attr_'.length);
  //     //     const values = value.split(',');
  
  //     //     // Create a should query for multiple values of the same attribute
  //     //     const valueQueries = values.map(valueObj => ({
  //     //       nested: {
  //     //         path: "attribute_key_values",
  //     //         query: {
  //     //           bool: {
  //     //             must: [
  //     //               { term: { "attribute_key_values.key": attributeName } },
  //     //               { terms: { "attribute_key_values.value": values.map(v => v.trim()) } }
  //     //             ]
  //     //           }
  //     //         }
  //     //       }
  //     //     }));
  
  //     //     // Add the attribute query to the filter array
  //     //     if (valueQueries.length > 0) {
  //     //       attributeQueries.push({
  //     //         bool: {
  //     //           should: valueQueries,
  //     //           minimum_should_match: 1
  //     //         }
  //     //       });
  //     //     }
  //     //   }
  //     // }
  
  //     // // Add attribute queries to filter if they exist
  //     // if (attributeQueries.length > 0) {
  //     //   filterQuery.push(...attributeQueries);
  //     // }

  //     // Handle dynamic product attributes
  //     const attributeQueries = Object.entries(searchRequest)
  //         .filter(([key]) => key.startsWith('product_attr_'))
  //         .map(([key, value]) => ({
  //           nested: {
  //             path: "attribute_key_values",
  //             query: {
  //               bool: {
  //               must: [
  //                 { term: { "attribute_key_values.key": key.slice('product_attr_'.length) } },
  //                 { terms: { "attribute_key_values.value": value.split(',').map(v => v.trim()) } }
  //               ]
  //             }
  //           }
  //         }
  //       }));
  //     if (attributeQueries.length > 0) filterQuery.push(...attributeQueries);
  
  //     // Match for items that are marked as the first variant
  //     matchQuery.push({ match: { is_first: true } });
  
  //     // Handle price range filter
  //     if (searchRequest.priceMin || searchRequest.priceMax) {
  //       const priceRange = {};
  //       if (searchRequest.priceMin) priceRange.gte = parseFloat(searchRequest.priceMin);
  //       if (searchRequest.priceMax) priceRange.lte = parseFloat(searchRequest.priceMax);
  //       filterQuery.push({ range: { "item_details.price.value": priceRange } });
  //     }
  
  //     // Handle rating filter
  //     if (searchRequest.rating) {
  //       filterQuery.push({
  //         range: {
  //           "item_details.rating": { gte: parseFloat(searchRequest.rating) }
  //         }
  //       });
  //     }
  
  //     // Add geo distance filter based on latitude and longitude
  //     if (searchRequest.latitude && searchRequest.longitude) {
  //       filterQuery.push({
  //         geo_distance: {
  //           distance: searchRequest.distance || '10km',  // Default to 10km if no distance is specified
  //           "location_details.gps": {
  //             lat: parseFloat(searchRequest.latitude),
  //             lon: parseFloat(searchRequest.longitude),
  //           },
  //         }
  //       });
  //     }
  
  //     // Construct the final query with scoring
  //     const finalQuery = {
  //       function_score: {
  //         query: {
  //           bool: { must: matchQuery, filter: filterQuery }
  //         },
  //         functions: [
  //           { filter: { term: { "in_stock": true } }, weight: 10 },
  //           { filter: { term: { "in_stock": false } }, weight: 1 }
  //         ],
  //         score_mode: "sum",
  //         boost_mode: "multiply"
  //       }
  //     };
  
  //     // Handle pagination
  //     const size = parseInt(searchRequest.limit) || 10;
  //     const page = parseInt(searchRequest.pageNumber) || 1;
  //     const from = (page - 1) * size;
  
  //     // Handle sorting
  //     let sort = [];
  //     const validSortFields = ['price', 'quantity', 'rating'];
  //     if (searchRequest.sortField && validSortFields.includes(searchRequest.sortField)) {
  //         sort.push({ [`item_details.${searchRequest.sortField}.value`]: { order: searchRequest.sortOrder || 'asc' } });
  //     }

  //     // Execute the search query
  //     const queryResults = await client.search({
  //       // index: 'your_index_name',  // Explicitly specify index
  //       query: finalQuery,
  //       from: from,
  //       size: size,
  //       sort: sort.length ? sort : undefined,
  //       track_total_hits: true,    // Ensure accurate total count for pagination
  //       timeout: '30s',            // Add timeout for long-running queries
  //       _source: {                 // Only fetch fields you need
  //         includes: [
  //           'item_details',
  //           'provider_details',
  //           'location_details',
  //           'customisation_groups',
  //           'attribute_key_values',
  //           'in_stock'
  //         ]
  //       },
  //       search_after: searchRequest.searchAfter, // Optional: For deep pagination
  //       allow_partial_search_results: false      // Fail query if some shards fail
  //     });

  //     // Process results and add customization items
  //     const enhancedResults = await Promise.all(
  //       (queryResults.hits?.hits || []).map(async (hit) => {
  //         const item = hit._source;
          
  //         // Initialize customisation_items array
  //         item.customisation_items = [];
          
  //         // Handle customization groups if they exist
  //         if (Array.isArray(item?.customisation_groups) && item.customisation_groups.length > 0) {
  //           const groupIds = item.customisation_groups
  //             .map((data) => data?.id)
  //             .filter(Boolean);

  //           if (groupIds.length > 0) {
  //             // Construct customization query
  //             const customisationQuery = {
  //               bool: {
  //                 must: [
  //                   { terms: { customisation_group_id: groupIds } },
  //                   { match: { type: "customization" } },
  //                   { match: { language: targetLanguage } }
  //                 ]
  //               }
  //             };

  //             // Execute customization items query
  //             const customisationResults = await client.search({
  //               query: customisationQuery,
  //               size: 100
  //             });

  //             // Add customization items to the item
  //             item.customisation_items = customisationResults.hits.hits.map(
  //               (customHit) => customHit._source || {}
  //             );
  //           }
  //         }

  //       // Handle related items if parent_item_id exists
  //       if (item?.item_details?.parent_item_id) {
  //         const relatedQuery = {
  //           bool: {
  //             must: [
  //               { match: { language: targetLanguage } },
  //               { match: { "item_details.parent_item_id": item.item_details.parent_item_id } },
  //               { match: { "provider_details.id": item.provider_details?.id } },
  //               { match: { "location_details.id": item.location_details?.id } }
  //             ]
  //           }
  //         };

  //           const relatedResults = await client.search({
  //             query: relatedQuery,
  //             size: 100
  //           });

  //           // Add related items with mapped attributes
  //           item.related_items = relatedResults.hits.hits.map((relatedHit) => {
  //             const data = relatedHit._source || {};
              
  //             // Map attribute key-values for related items
  //             if (Array.isArray(data?.attribute_key_values)) {
  //               const flatObject = {};
  //               data.attribute_key_values.forEach(pair => {
  //                 if (pair?.key && pair?.value) {
  //                   flatObject[pair.key] = pair.value;
  //                 }
  //               });
  //               data.attributes = flatObject;
  //             }
              
  //             return data;
  //           });
  //         }

  //         // Map attribute key-values for main item
  //         if (Array.isArray(item?.attribute_key_values)) {
  //           const flatObject = {};
  //           item.attribute_key_values.forEach(pair => {
  //             if (pair?.key && pair?.value) {
  //               flatObject[pair.key] = pair.value;
  //             }
  //           });
  //           item.attributes = flatObject;
  //         }

  //         // Add locations array if location_details exists
  //         if (item?.location_details) {
  //           item.locations = [item.location_details];
  //         }

  //         return item;
  //       })
  //     );
  
  //     // Format and return the response
  //     return {
  //       // response: {
  //       //   count: queryResults.hits?.total?.value || 0,
  //       //   data: queryResults.hits?.hits.map(hit => hit._source) || [],
  //       //   pages: Math.ceil((queryResults.hits?.total?.value || 0) / size)
  //       // }
  //       response: {
  //         count: queryResults.hits?.total?.value || 0,
  //         data: enhancedResults,
  //         pages: Math.ceil((queryResults.hits?.total?.value || 0) / size),
  //         currentPage: page
  //       }
  //     };
  //   } catch (err) {
  //     // Catch and rethrow the error, providing a clear message for the caller
  //     console.error('Error in search:', {
  //       error: err.message,
  //       stack: err.stack
  //     });
  //     throw new Error(`Search failed: ${err.message}`);
  //   }
  // }

  async search(searchRequest = {}, targetLanguage = "en") {
    try {
      
      if (!targetLanguage || typeof targetLanguage !== 'string') {
        throw new BadRequestParameterError('Invalid target language');
      }
  
      // Initialize queries
      const matchQuery = [];
      const filterQuery = [];
  
      // Add static filters
      filterQuery.push(
        { term: { language: targetLanguage } },
        { term: { "item_details.time.label": 'enable' } },
        { terms: { "location_details.time.label": ['enable', 'open'] } },
        { term: { "provider_details.time.label": 'enable' } },
        { term: { is_first: true } }
      );
  
      // Handle search by item name
      if (searchRequest.name) {
        matchQuery.push({
          bool: {
            should: [
              { match_phrase: { "item_details.descriptor.name": { query: searchRequest.name, slop: 1, boost: 4 } } },
              { match: { "item_details.descriptor.name": { query: searchRequest.name, fuzziness: "AUTO", prefix_length: 2, operator: "OR", boost: 2 } } }
            ],
            minimum_should_match: 1
          }
        });
      }
  
      // Handle filters for provider, location, and category IDs
      const providerIds = searchRequest.providerIds ? searchRequest.providerIds.split(',') : [];
      const locationIds = searchRequest.locationIds ? searchRequest.locationIds.split(',') : [];
      const categoryIds = searchRequest.categoryIds ? searchRequest.categoryIds.split(',') : [];
      if (providerIds.length > 0) filterQuery.push({ terms: { "provider_details.id": providerIds } });
      if (locationIds.length > 0) filterQuery.push({ terms: { "location_details.id": locationIds } });
      if (categoryIds.length > 0) filterQuery.push({ terms: { "item_details.category_id": categoryIds } });
  
      // Handle dynamic product attributes
      const attributeQueries = Object.entries(searchRequest)
        .filter(([key]) => key.startsWith('product_attr_'))
        .map(([key, value]) => ({
          nested: {
            path: "attribute_key_values",
            query: {
              bool: {
                must: [
                  { term: { "attribute_key_values.key": key.slice('product_attr_'.length) } },
                  { terms: { "attribute_key_values.value": value.split(',').map(v => v.trim()) } }
                ]
              }
            }
          }
        }));
      if (attributeQueries.length > 0) filterQuery.push(...attributeQueries);
  
      // Handle price range and rating filters
      if (searchRequest.priceMin || searchRequest.priceMax) {
        const priceRange = {};
        if (searchRequest.priceMin) priceRange.gte = parseFloat(searchRequest.priceMin);
        if (searchRequest.priceMax) priceRange.lte = parseFloat(searchRequest.priceMax);
        filterQuery.push({ range: { "item_details.price.value": priceRange } });
      }
      if (searchRequest.rating) {
        filterQuery.push({ range: { "item_details.rating": { gte: parseFloat(searchRequest.rating) } } });
      }
  
      // Handle geo distance filter
      // if (searchRequest.latitude && searchRequest.longitude) {
      //   filterQuery.push({
      //     geo_distance: {
      //       distance: searchRequest.distance || '10km',
      //       "location_details.gps": {
      //         lat: parseFloat(searchRequest.latitude),
      //         lon: parseFloat(searchRequest.longitude),
      //       },
      //     }
      //   });
      // }
  
      // Construct the final query
      const finalQuery = {
        function_score: {
          query: { bool: { must: matchQuery, filter: filterQuery } },
          functions: [
            { filter: { term: { "in_stock": true } }, weight: 10 },
            { filter: { term: { "in_stock": false } }, weight: 1 }
          ],
          score_mode: "sum",
          boost_mode: "multiply"
        }
      };
  
      // Handle pagination and sorting
      const size = parseInt(searchRequest.limit) || 10;
      const page = parseInt(searchRequest.pageNumber) || 1;
      const from = (page - 1) * size;
      const sort = this.buildSortQuery(searchRequest);
  
      // Execute the search query
      const queryResults = await client.search({
        query: finalQuery,
        from: from,
        size: size,
        sort: sort,
      });
  
      // Process results
      const enhancedResults = await this.processResults(queryResults.hits?.hits || [], targetLanguage);
  
      // Return the response
      return {
        response: {
          count: queryResults.hits?.total?.value || 0,
          data: enhancedResults,
          pages: Math.ceil((queryResults.hits?.total?.value || 0) / size),
          currentPage: page
        }
      };
    } catch (err) {
      console.error('Error in search:', { error: err.message, stack: err.stack, searchRequest, targetLanguage });
      throw new Error(`Search failed: ${err.message}`);
    }
  }

  async globalSearchItems(searchRequest = {}, targetLanguage = "en") {
    try {
      let matchQuery = [];
      let searchQuery = [];
      
      // Base match queries
      matchQuery.push({
        match: {
          language: targetLanguage,
        },
      });
  
      matchQuery.push({
        match: {
          "item_details.time.label": 'enable',
        },
      });
  
      matchQuery.push({
        terms: {
          "location_details.time.label": ['enable','open'],
        },
      });
  
      matchQuery.push({
        match: {
          "provider_details.time.label": 'enable',
        },
      });
  
      matchQuery.push({
        match: {
          "type": 'item',
        },
      });
  
      if (searchRequest.name) {
        searchQuery.push({
          match: {
            "item_details.descriptor.name": searchRequest.name,
          },
        });
  
        searchQuery.push({
          match: {
            "item_details.descriptor.short_desc": searchRequest.name,
          },
        });
        searchQuery.push({
          match: {
            "item_details.descriptor.long_desc": searchRequest.name,
          },
        });
        searchQuery.push({
          match: {
            "item_details.category_id": searchRequest.name,
          },
        });
      }
  
      if (searchRequest.providerIds) {
        matchQuery.push({
          match: {
            "provider_details.id": searchRequest.providerIds,
          },
        });
      }
  
      if (searchRequest.categoryIds) {
        matchQuery.push({
          match: {
            "item_details.category_id": searchRequest.categoryIds,
          },
        });
      }
      // For variants we set is_first = true
      matchQuery.push({
        match: {
          is_first: true,
        },
      });
      
      // matchQuery.push({
      //   match: {
      //     "in_stock": true
      //   },
      // });
  
      let shouldQuery = []

      if(searchRequest.name){

       shouldQuery.push( {
          "match": {
            "item_details.descriptor.name": searchRequest.name
          },
        })

        shouldQuery.push({
          "match": {
            "item_details.category_id": searchRequest.name
          },
        })
       
      }

      if(searchRequest.category){
        shouldQuery.push({
          "match": {
            "item_details.category_id": searchRequest.category
          },
        })
      }

      // Define filter conditions
      let filterConditions = [
        {
          match: {
            "location_details.type": "pan",
          },
        },
      ];
  
      if (searchRequest.latitude && searchRequest.longitude) {
        filterConditions.push({
          geo_shape: {
            "location_details.polygons": {
              shape: {
                type: "point",
                coordinates: [
                  parseFloat(searchRequest.latitude),
                  parseFloat(searchRequest.longitude),
                ],
              },
            },
          },
        });
      }
  
      // Set the timezone to Asia/Kolkata (IST)
      const timezone = 'Asia/Kolkata';
  
      // Get the current time in the specified timezone
      const today = moment().tz(timezone);
  
      // Get the current day of the week (1 = Monday, ..., 7 = Sunday)
      const currentDay = today.day() === 0 ? 7 : today.day(); // Adjusting for Sunday
  
      // Get the current time in hours and minutes
      const hours = today.hours().toString().padStart(2, '0');
      const minutes = today.minutes().toString().padStart(2, '0');
      const currentTime = parseInt(hours + minutes, 10);
  
      console.log(`Current Day: ${currentDay}`);
      console.log(`Current Time: ${currentTime}`);
      let query_obj = {
        function_score: {
          query: {
            bool: {
              must: [
                {
                  bool: {
                    must: matchQuery,
                    should: shouldQuery,
                    minimum_should_match: 1
                  },
                },
                // Default language search
                {
                  match: {
                    language: targetLanguage,
                  },
                },
                {
                  bool: {
                    should: [
                      {
                        match: {
                          "location_details.type": "pan",
                        },
                      },
                      {
                        geo_shape: {
                          "location_details.polygons": {
                            shape: {
                              type: "point",
                              coordinates: [
                                parseFloat(searchRequest.latitude),
                                parseFloat(searchRequest.longitude),
                              ],
                            },
                          },
                        },
                      },
                    ],
                  },
                },
              ],
            },
          },
          functions: [
            {
              filter: {
                bool: {
                  must_not: {
                    nested: {
                      path: `location_availabilities.${currentDay}`,
                      query: {
                        bool: {
                          must: [
                            { range: { [`location_availabilities.${currentDay}.start`]: { lte: currentTime } } },
                            { range: { [`location_availabilities.${currentDay}.end`]: { gte: currentTime } } }
                          ]
                        }
                      }
                    }
                  }
                }
              },
              weight: 10 // High weight for documents not matching the filter
            },
            {
              filter: {
                nested: {
                  path: `location_availabilities.${currentDay}`,
                  query: {
                    bool: {
                      should: [
                        {
                          bool: {
                            must: [
                              { range: { [`location_availabilities.${currentDay}.start`]: { lte: currentTime } } },
                              { range: { [`location_availabilities.${currentDay}.end`]: { gte: currentTime } } }
                            ]
                          }
                        }
                      ]
                    }
                  }
                }
              },
              weight: 0 // Low weight for documents matching the filter
            },
            // New filter for inStock
            {
              filter: {
                term: {
                  "in_stock": true
                }
              },
              weight: 0 // High weight for in-stock items
            },
            {
              filter: {
                bool: {
                  must_not: {
                    term: {
                      "in_stock": true
                    }
                  }
                }
              },
              weight: 10  // Low weight for out-of-stock items
            }
          ],
          score_mode: "sum", // Combine scores from all functions
          boost_mode: "replace" // Replace the final score with the score calculated by the functions
        }
      };
      // Calculate the starting point for the search
      let size = parseInt(searchRequest.limit);
      let page = parseInt(searchRequest.pageNumber);
      const from = (page - 1) * size;
  
      console.log(query_obj);
      // Perform the search with pagination parameters
      let queryResults = await client.search({
        index: 'items', // Ensure you specify the index name
        body: {
          query: query_obj,
          sort: [
            {
              _score: {
                order: "desc",
              },
            },
          ],
          from: from,
          size: size,
        },
      });
  
      // Extract the _source field from each hit
      let sources = queryResults.hits.hits.map((hit) => hit._source);
  
      // Get the total count of results
      let totalCount = queryResults.hits.total.value;
  
      // Return the total count and the sources
      return {
        count: totalCount,
        data: sources,
        pages: parseInt(Math.round(totalCount / size)),
      };
    } catch (err) {
      console.error("Error executing search query:", err);
      throw err;
    }
  }
  
  async getItems(searchRequest = {}, targetLanguage = "en") {
    try {
      let matchQuery = [];
  
      // Match on the target language
      matchQuery.push({
        match: {
          language: targetLanguage,
        },
      });
  
      // Match on customMenu if provided
      if (searchRequest.customMenu) {
        matchQuery.push({
          nested: {
            path: "customisation_menus",
            query: {
              bool: {
                must: [
                  {
                    match: {
                      "customisation_menus.id": searchRequest.customMenu,
                    },
                  },
                ],
              },
            },
          },
        });
      }
  
      let query_obj = {
        bool: {
          must: matchQuery,
        },
      };
  
      // Add function_score to boost in_stock items
      let boostedQuery = {
        function_score: {
          query: query_obj,
          functions: [
            {
              filter: {
                term: {
                  in_stock: true,
                },
              },
              weight: 2, // Adjust the weight as necessary
            },
            {
              filter: {
                term: { "in_stock": false },
              },
              weight: 1, // Lower weight for out-of-stock items
            },
          ],
          boost_mode: "multiply", // This will multiply the score by the weight
          score_mode: "sum", // Sum the scores to combine with the base query
        },
      };
  
      // Perform the search with the boosted query
      let queryResults = await client.search({
        body: {
          query: boostedQuery,
        },
      });
  
      // Extract the _source field from each hit
      let sources = queryResults.hits.hits.map((hit) => hit._source);
  
      // Get the total count of results
      let totalCount = queryResults.hits.total.value;
  
      // Return the total count and the sources
      return {
        response: {
          count: totalCount,
          data: sources,
          pages: totalCount,
        },
      };
    } catch (err) {
      throw err;
    }
  }

  // async getProviderDetails(searchRequest = {}, targetLanguage = "en") {
  //   try {
  //   // Use term queries for exact matches
  //   const query_obj = {
  //     bool: {
  //       must: [
  //         { term: { language: targetLanguage } },
  //         { term: { type: 'item' } },
  //         { term: { "provider_details.id": searchRequest.providerId } },
  //         { term: { "location_details.id": searchRequest.locationId } }
  //       ]
  //     }
  //   };
  
  //     // Define aggregations to get unique category IDs
  //     let aggr_query = {
  //       unique_categories: {
  //         terms: {
  //           field: "item_details.category_id",  // Make sure this field is indexed properly
  //           size: 1000  // Adjust the size based on the expected number of categories
  //           // min_doc_count: 1  // Only include categories with at least one item
  //         },
  //       // provider_status: {
  //       //     filter: {
  //       //       term: { "provider_details.time.label": "enable" }
  //       //     }
  //       //   },
  //       // location_status: {
  //       //     filter: {
  //       //       terms: { "location_details.time.label": ["enable", "open"] }
  //       //     }
  //       //   }
  //       }
  //     };
  
  //     let queryResults = await client.search({
  //       // index: 'your_index_name',
  //       body: {
  //         query: query_obj,
  //         aggs: aggr_query,
  //         size: 1  // Only need 1 hit as we are using aggregations
  //         // _source: {
  //         //   includes: [
  //         //     "context.domain",
  //         //     "provider_details.*",
  //         //     "location_details.*",
  //         //     "fulfillment_details.*"
  //         //   ]
  //         // },
  //         //timeout: '30s'
  //       }
  //     });

  //     // Check if provider and location exist and are active
  //   //  const providerActive = queryResults.aggregations?.provider_status?.doc_count > 0;
  //   //  const locationActive = queryResults.aggregations?.location_status?.doc_count > 0;

  //   // if (!queryResults.hits?.hits?.length) {
  //   //   throw new Error('Provider or location not found');
  //   // }

  //   // if (!providerActive || !locationActive) {
  //   //   throw new Error('Provider or location is not active');
  //   // }
    
  //     // Extract provider details from the first hit (if available)
  //     let provider_details = null;
  //     if (queryResults.hits.hits.length > 0) {
  //       let firstHit = queryResults.hits.hits[0]._source;
  //       provider_details = {
  //         domain: firstHit.context?.domain,
  //         provider_details: (firstHit?.provider_details || {}),
  //         location_details: (firstHit?.location_details || {}),
  //         fulfillment_details: (firstHit?.fulfillment_details || {})
  //       };
  //     }
  
  //     // Add categories to provider_details
  //     if (provider_details) {
  //       const categories = provider_details.provider_details.tags
  //       .filter((tag) => tag.code === "serviceability")
  //       .flatMap((serviceability) => serviceability.list
  //         .filter((item) => item.code === "category")
  //         .map((item) => item.value)
  //       );

  //       let unique_categories = categories?.length ? categories?.map(category => ({
  //         code: category,
  //         label: category,
  //         url: CATEGORIES[category], // Ensure CATEGORIES has mappings or handle undefined URLs
  //       })) : [];
  //       provider_details.categories = unique_categories;
  //     }
  
  //     // Return the provider details with unique categories
  //     return provider_details;
  //   } catch (err) {
  //     console.error('Error in getProviderDetails:', {
  //       error: err.message,
  //       stack: err.stack
  //     });
  //     throw err;
  //   }
  // }
  
  async getProviderDetails(searchRequest = {}, targetLanguage = "en") {
    try {
      
      // Use filter for exact matches (better performance)
      const query_obj = {
        bool: {
          filter: [
            { term: { language: targetLanguage } },
            { term: { type: 'item' } },
            { term: { "provider_details.id": searchRequest.providerId } },
            { term: { "location_details.id": searchRequest.locationId } }
          ]
        }
      };
  
      // Execute the search query
      const queryResults = await client.search({
        body: {
          query: query_obj,
          size: 1, // Only need 1 hit
          _source: {
            includes: [
              "context.domain",
              "provider_details.*",
              "location_details.*",
              "fulfillment_details.*"
            ]
          },
          timeout: '30s' // Add timeout for long-running queries
        }
      });
  
      // Check if provider and location exist
      if (!queryResults.hits?.hits?.length) {
        return null
      }
  
      // Extract provider details from the first hit
      const firstHit = queryResults.hits.hits[0]._source;
      const provider_details = {
        domain: firstHit.context?.domain || null,
        provider_details: firstHit.provider_details || {},
        location_details: firstHit.location_details || {},
        fulfillment_details: firstHit.fulfillment_details || {}
      };
  
      // Check if provider and location are active
      const providerActive = provider_details.provider_details?.time?.label === 'enable';
      const locationActive = ['enable', 'open'].includes(provider_details.location_details?.time?.label);
  
      if (!providerActive || !locationActive) {
        throw new Error('Provider or location is not active');
      }
  
      // Extract categories from provider_details.tags
      const categories = provider_details.provider_details.tags
        ?.filter((tag) => tag.code === "serviceability")
        ?.flatMap((serviceability) => serviceability.list
          .filter((item) => item.code === "category")
          .map((item) => item.value)
        ) || [];
  
      // Map categories to the required format
      provider_details.categories = categories.map((category) => ({
        code: category,
        label: category,
        url: CATEGORIES[category] || null // Handle undefined URLs
      }));
  
      // Return the provider details with categories
      return provider_details;
    } catch (err) {
      console.error('Error in getProviderDetails:', {
        error: err.message,
        stack: err.stack,
        searchRequest,
        targetLanguage
      });
      throw err; // Re-throw the error for the caller to handle
    }
  }
  
  async getLocationDetails(searchRequest = {}, targetLanguage = "en") {
    try {
      // providerIds=ondc-mock-server-dev.thewitslab.com_ONDC:RET10_ondc-mock-server-dev.thewitslab.com
      let matchQuery = [];

      matchQuery.push({
        match: {
          language: targetLanguage,
        },
      });

      if (searchRequest.id) {
        matchQuery.push({
          match: {
            "location_details.id": searchRequest.id,
          },
        });
      }

      matchQuery.push({
        match: {
          "type": 'item',
        },
      });

      let query_obj = {
        bool: {
          must: matchQuery,
        },
      };

      let queryResults = await client.search({
        query: query_obj,
      });

      let location_details = null;
      if (queryResults.hits.hits.length > 0) {
        let details = queryResults.hits.hits[0]._source; // Return the source of the first hit
        let minDays=0;
        if(searchRequest.pincode){
          let docPincode = details.location_details.address.area_code;
          let matchCount = 0;
          for (let i = 0; i < searchRequest.pincode.length; i++) {
            if (i < docPincode.length && searchRequest.pincode.charAt(i) == docPincode.charAt(i)) {
              matchCount++;
            }else {
              break;
          }
          }
          if (matchCount == 6) minDays = 15*60;
          else if (matchCount == 5) minDays = 30*60;
          else if (matchCount == 4) minDays = 45*60;
          else if (matchCount == 3) minDays = 60*60;
          else if (matchCount == 2) minDays = 1440*60;
          else if (matchCount == 1) minDays = 1440*60;
          else minDays = 10080*60; //other state
        }
        location_details = {
          domain: details.context.domain,
          minDays:minDays,
          minDaysWithTTS : minDays + details.location_details.median_time_to_ship,
          provider_descriptor: details.provider_details.descriptor,
          provider_details: details.provider_details,
          ...details.location_details,
          fulfillment:details.fulfillment,
          time_to_ship: details.item_details["@ondc/org/time_to_ship"]
        };
      }

      return location_details;
    } catch (err) {
      throw err;
    }
  }

  // async getItemDetails(searchRequest = {}, targetLanguage = "en") {
  //   try {
  //     let matchQuery = [];
  
  //     // Validate targetLanguage
  //     if (targetLanguage) {
  //       matchQuery.push({
  //         match: {
  //           language: targetLanguage,
  //         },
  //       });
  //     }
  
  //     // Validate searchRequest.id
  //     console.log("searchRequest" , searchRequest)
  //     if (searchRequest.id) {
  //       matchQuery.push({
  //         match: {
  //           id: searchRequest.id,
  //         },
  //       });
  //     }
  
  //     let query_obj = {
  //       bool: {
  //         must: matchQuery,
  //       },
  //     };
  
  //     let queryResults = await client.search({
  //       index: 'items',
  //       query: query_obj,
  //       // timeout: '30s'
  //     });
  
  //     let item_details = null;
      
  //     // Validate queryResults and hits
  //     if (queryResults?.hits?.hits?.length > 0) {
  //       item_details = queryResults.hits.hits[0]?._source || {};
  
  //       // Initialize customisation_items if item_details exists
  //       if (item_details) {
  //         item_details.customisation_items = [];
  //       }
  
  //       // Check for related items if parent_item_id exists
  //       if (item_details?.item_details?.parent_item_id) {
  //         let relatedMatchQuery = [];
  
  //         // Validate targetLanguage again for related items query
  //         if (targetLanguage) {
  //           relatedMatchQuery.push({
  //             match: {
  //               language: targetLanguage,
  //             },
  //           });
  //         }
  
  //         // Validate parent_item_id
  //         if (item_details?.item_details?.parent_item_id) {
  //           relatedMatchQuery.push({
  //             match: {
  //               "item_details.parent_item_id": item_details.item_details.parent_item_id,
  //             },
  //           });
  //         }
  
  //         // Validate provider id
  //         if (item_details?.provider_details?.id) {
  //           relatedMatchQuery.push({
  //             match: {
  //               "provider_details.id": item_details.provider_details.id,
  //             },
  //           });
  //         }
  
  //         // Validate location id
  //         if (item_details?.location_details?.id) {
  //           relatedMatchQuery.push({
  //             match: {
  //               "location_details.id": item_details.location_details.id,
  //             },
  //           });
  //         }
  
  //         let relatedQueryObj = {
  //           bool: {
  //             must: relatedMatchQuery,
  //           },
  //         };
  
  //         let relatedQueryResults = await client.search({
  //           query: relatedQueryObj,
  //           size: 100
  //         });
  
  //         // Map related items with validation
  //         item_details.related_items = relatedQueryResults.hits.hits.map((hit) => {
  //           let data = hit?._source || {};
  
  //           // Map attribute key-values
  //           if (Array.isArray(data?.attribute_key_values)) {
  //             const flatObject = {};
  //             data.attribute_key_values.forEach(pair => {
  //               if (pair?.key && pair?.value) {
  //                 flatObject[pair.key] = pair.value;
  //               }
  //             });
  //             data.attributes = flatObject;
  //           }
  
  //           return data;
  //         });
  //       } else if (Array.isArray(item_details?.customisation_groups) && item_details.customisation_groups.length > 0) {
  //         let customisationQuery = [];
  //         let groupIds = item_details.customisation_groups.map((data) => data?.id).filter(Boolean);
  
  //         // Validate groupIds
  //         if (groupIds.length > 0) {
  //           customisationQuery.push({
  //             terms: {
  //               customisation_group_id: groupIds,
  //             },
  //           });
  //         }
  
  //         // Match type "customization"
  //         customisationQuery.push({
  //           match: {
  //             type: "customization",
  //           },
  //         });
  
  //         // Validate targetLanguage again for customisation query
  //         if (targetLanguage) {
  //           customisationQuery.push({
  //             match: {
  //               language: targetLanguage,
  //             },
  //           });
  //         }
  
  //         let customisationQueryObj = {
  //           bool: {
  //             must: customisationQuery,
  //           },
  //         };
  
  //         let customisationQueryResults = await client.search({
  //           query: customisationQueryObj,
  //           size: 100
  //         });
  
  //         // Map customisation items
  //         item_details.customisation_items = customisationQueryResults.hits.hits.map((hit) => hit?._source || {});
  //       }
  //     }
  
  //     // Validate location_details
  //     if (item_details?.location_details) {
  //       item_details.locations = [item_details.location_details];
  //     }
  
  //     // Map attribute key-values
  //     if (Array.isArray(item_details?.attribute_key_values)) {
  //       const flatObject = {};
  //       item_details.attribute_key_values.forEach(pair => {
  //         if (pair?.key && pair?.value) {
  //           flatObject[pair.key] = pair.value;
  //         }
  //       });
  //       item_details.attributes = flatObject;
  //     }
  
  //     return item_details;
  
  //   } catch (err) {
  //     console.error("Error in getItemDetails:", err);
  //     throw err;
  //   }
  // }

  async getItemDetails(searchRequest = {}, targetLanguage = "en") {
    try {
      // Validate inputs
      if (!searchRequest.id) {
        throw new Error('Item ID is required');
      }
  
      let filterQuery = [];
  
      // Add static filters
      if (targetLanguage) {
        filterQuery.push({ term: { language: targetLanguage } });
      }
      if (searchRequest.id) {
        filterQuery.push({ term: { id: searchRequest.id } });
      }
  
      // Main query
      let query_obj = {
        bool: {
          filter: filterQuery,
        },
      };
  
      // Execute the search query
      let queryResults = await client.search({
        index: 'items',
        query: query_obj,
        timeout: '30s'
      });
  
      // Validate queryResults and hits
      if (!queryResults?.hits?.hits?.length) {
        return null
      }
  
      let item_details = queryResults.hits.hits[0]?._source || {};
  
      // Initialize customisation_items and related_items
      item_details.customisation_items = [];
      item_details.related_items = [];
  
      // Fetch related items and customization items in parallel
      const [relatedItems, customisationItems] = await Promise.all([
        this.fetchRelatedItems(item_details, targetLanguage),
        this.fetchCustomizationItems(item_details, targetLanguage)
      ]);
  
      // Assign fetched items
      item_details.related_items = relatedItems;
      item_details.customisation_items = customisationItems;
  
      // Map attribute key-values
      if (Array.isArray(item_details?.attribute_key_values)) {
        item_details.attributes = this.flattenAttributes(item_details.attribute_key_values);
      }
  
      // Add locations array if location_details exists
      if (item_details?.location_details) {
        item_details.locations = [item_details.location_details];
      }
  
      return item_details;
  
    } catch (err) {
      console.error('Error in getItemDetails:', {
        error: err.message,
        stack: err.stack,
        searchRequest,
        targetLanguage
      });
      throw err; // Re-throw the error for the caller to handle
    }
  }
  
//   async getAttributes(searchRequest) {
//     try {
//         let matchQuery = [];
  
//         if (searchRequest.category) {
//             matchQuery.push({
//                 match: {
//                     "item_details.category_id": searchRequest.category,
//                 },
//             });
//         }
//         matchQuery.push({
//             match: {
//                 "item_details.time.label": 'enable',
//             },
//         });
//         matchQuery.push({
//             terms: {
//                 "location_details.time.label": ['enable', 'open'],
//             },
//         });
//         matchQuery.push({
//             match: {
//                 "provider_details.time.label": 'enable',
//             },
//         });
//         matchQuery.push({
//             match: {
//                 "type": 'item',
//             },
//         });

//         if (searchRequest.provider) {
//             matchQuery.push({
//                 match: {
//                     "provider_details.id": searchRequest.providerId,
//                 },
//             });
//         }

//         const pageSize = searchRequest.limit || 10; // Default to 10 if not provided
//         const page = searchRequest.page || 1; // Default to 1 if not provided
//         const from = (page - 1) * limit; // Calculate the starting point for pagination

//         const response = await client.search({
//             index: 'items',
//             size: 0, // We don't need actual documents, only aggregation results
//             body: {
//                 query: {
//                     bool: {
//                         must: matchQuery
//                     }
//                 },
//                 aggs: {
//                     unique_attribute_keys: {
//                         nested: {
//                             path: 'attribute_key_values'
//                         },
//                         aggs: {
//                             paginated_keys: {
//                                 composite: {
//                                     size: pageSize,
//                                     sources: [
//                                         { key: { terms: { field: 'attribute_key_values.key' } } }
//                                     ],
//                                     after: searchRequest.afterKey ? { key: searchRequest.afterKey } : undefined
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         });

//         const buckets = response.aggregations.unique_attribute_keys.paginated_keys.buckets;
//         const uniqueKeys = buckets.map((bucket) => { return { code: bucket.key.key }; });

//         // Get the 'after_key' for the next page, if available
//         const afterKey = response.aggregations.unique_attribute_keys.paginated_keys.after_key || null;

//         return {
//             response: {
//                 data: uniqueKeys,
//                 count: uniqueKeys.length,
//                 pages: Math.ceil(uniqueKeys.length / pageSize),
//                 afterKey
//             }
//         };

//     } catch (err) {
//       console.error('Error in getAttributes:', {
//         error: err.message,
//         stack: err.stack
//       });
//         throw err;
//     }
// }

async getAttributes(searchRequest) {
  try {
    let filterQuery = [];
    // Add static filters
    filterQuery.push(
      { term: { "item_details.time.label": 'enable' } },
      { terms: { "location_details.time.label": ['enable', 'open'] } },
      { term: { "provider_details.time.label": 'enable' } },
      { term: { type: 'item' } }
    );
    // Add dynamic filters
    if (searchRequest.category) {
      filterQuery.push({ term: { "item_details.category_id": searchRequest.category } });
    }
    if (searchRequest.providerId) {
      filterQuery.push({ term: { "provider_details.id": searchRequest.providerId } });
    }
    // Handle pagination
    const pageSize = searchRequest.limit || 10; // Default to 10 if not provided
    // Execute the search query with cardinality aggregation
    const response = await client.search({
      index: 'items',
      size: 0, // We don't need actual documents, only aggregation results
      body: {
        query: {
          bool: {
            filter: filterQuery
          }
        },
        aggs: {
          unique_attribute_keys_count: {
            cardinality: {
              field: 'attribute_key_values.key'
            }
          },
          unique_attribute_keys: {
            nested: {
              path: 'attribute_key_values'
            },
            aggs: {
              paginated_keys: {
                composite: {
                  size: pageSize,
                  sources: [
                    { key: { terms: { field: 'attribute_key_values.key' } } }
                  ],
                  after: searchRequest.afterKey ? { key: searchRequest.afterKey } : undefined
                }
              }
            }
          }
        }
      }
    });
    // Process results
    const buckets = response.aggregations?.unique_attribute_keys?.paginated_keys?.buckets || [];
    const uniqueKeys = buckets.map((bucket) => ({ code: bucket.key.key }));
    // Get the 'after_key' for the next page, if available
    const afterKey = response.aggregations?.unique_attribute_keys?.paginated_keys?.after_key || null;
    // Calculate total count (approximate)
    const totalCount = response.aggregations?.unique_attribute_keys_count?.value || 0;
    const totalPages = Math.ceil(totalCount / pageSize);
    return {
      response: {
        data: uniqueKeys,
        count: totalCount,
        pages: totalPages,
        afterKey
      }
    };
  } catch (err) {
    console.error('Error in getAttributes:', {
      error: err.message,
      stack: err.stack,
      searchRequest
    });
    throw err; // Re-throw the error for the caller to handle
  }
}

  // async getUniqueCategories(searchRequest, targetLanguage = "en") {
  //   try {
  //     let matchQuery = [];
  
  //     // Build match queries based on searchRequest parameters
  //     if (searchRequest.domain) {
  //       matchQuery.push({
  //         match: {
  //           "context.domain": searchRequest.domain,
  //         },
  //       });
  //     }
  
  //     matchQuery.push({
  //       match: {
  //         language: targetLanguage,
  //       },
  //     });
  
  //     matchQuery.push({
  //       match: {
  //         "item_details.time.label": 'enable',
  //       },
  //     });
  
  //     matchQuery.push({
  //       terms: {
  //         "location_details.time.label": ['enable', 'open'],
  //       },
  //     });
  
  //     matchQuery.push({
  //       match: {
  //         "provider_details.time.label": 'enable',
  //       },
  //     });
  
  //     matchQuery.push({
  //       match: {
  //         "type": 'item',
  //       },
  //     });
  
  //     let query_obj = {
  //       bool: {
  //         must: matchQuery,
  //       },
  //     };
  
  //     // Execute search with aggregations
  //     const totalCategories = await client.search({
  //       index: "items",
  //       size: 0,
  //       query: query_obj,
  //       aggs: {
  //         domainCategories: {
  //           terms: {
  //             field: "context.domain",
  //             size: 10000000,
  //           },
  //           aggs: {
  //             uniqueCategories: {
  //               terms: {
  //                 field: "item_details.category_id",
  //                 size: 1000000,
  //               },
  //             },
  //           },
  //         },
  //       },
  //     });
  
  //     // Check if aggregations exist in the response
  //     if (!totalCategories.aggregations || !totalCategories.aggregations.domainCategories) {
  //       throw new Error("Missing aggregations in Elasticsearch response.");
  //     }
  
  //     const domainBuckets = totalCategories.aggregations.domainCategories.buckets;
  //     let result = {};

  //     console.log("domainBucket" , domainBuckets)
  
  //     // Process and structure the results
  //     domainBuckets.forEach(domainBucket => {
  //       const domainName = domainBucket.key;
  //       let uniqueCategories = domainBucket.uniqueCategories.buckets.map(category => ({
  //         code: category.key,
  //         label: category.key,
  //         url: CATEGORIES[category.key], // Ensure CATEGORIES has mappings or handle undefined URLs
  //       }));

  //       uniqueCategories = uniqueCategories.filter(category => category.url)
  //       result[domainName] = uniqueCategories;
  //     });

  //     if(domainBuckets.length == 0){
  //       return null
  //     }

  //     return result 
  
  //   } catch (error) {
  //     console.error("Error in getUniqueCategories:", error);
  //     // Return a clear error response or throw the error, depending on requirements
  //     throw error;
  //   }
  // }
  
  // async getAttributesValues(searchRequest) {
  //   try {
  //     let matchQuery = [];
  
  //     if (searchRequest.category) {
  //       matchQuery.push({
  //         match: {
  //           "item_details.category_id": searchRequest.category,
  //         },
  //       });
  //     }
  
  //     matchQuery.push({
  //       match: {
  //         "item_details.time.label": 'enable',
  //       },
  //     });

  //     matchQuery.push({
  //       match: {
  //         "type": 'item',
  //       },
  //     })

  //     if (searchRequest.provider) {
  //       matchQuery.push({
  //         match: {
  //           "provider_details.id": searchRequest.providerId,
  //         },
  //       });
  //     }
  
  //     // Create the nested query based on the provided attribute key
  //     let attributeQuery = {
  //       nested: {
  //         path: "attribute_key_values",
  //         query: {
  //           bool: {
  //             must: [
  //               { term: { "attribute_key_values.key": searchRequest.attribute_code} }  // Replace "gender" as needed
  //             ]
  //           }
  //         }
  //       }
  //     };
  
  //     // Combine all the queries
  //     const response = await client.search({
  //       index: 'items',
  //       body: {
  //         size: 0,
  //         query: {
  //           bool: {
  //             must: [
  //               ...matchQuery,
  //               attributeQuery
  //             ]
  //           }
  //         },
  //         aggs: {
  //           unique_attribute_values: {
  //             nested: {
  //               path: "attribute_key_values"
  //             },
  //             aggs: {
  //               filtered_attribute: {
  //                 filter: {
  //                   term: {
  //                     "attribute_key_values.key": searchRequest.attribute_code// Replace "gender" as needed
  //                   }
  //                 },
  //                 aggs: {
  //                   unique_values: {
  //                     terms: {
  //                       field: "attribute_key_values.value",
  //                       size: 1000  // Adjust the size as needed
  //                     }
  //                   }
  //                 }
  //               }
  //             }
  //           }
  //         }
  //       },
  //     });
  
  //     // Access the aggregation results correctly
  //     const uniqueValues = response.aggregations.unique_attribute_values.filtered_attribute.unique_values.buckets.map(
  //       (bucket) => bucket.key,
  //     );
  
  //     // Return the result
  //     return { response: { data: uniqueValues, count: uniqueValues.length } };
  
  //   } catch (err) {
  //     throw err;
  //   }
  // }

  async getUniqueCategories(searchRequest, targetLanguage = "en") {
    try {
      
      let filterQuery = [];
  
      // Add static filters
      filterQuery.push(
        { term: { language: targetLanguage } },
        { term: { "item_details.time.label": 'enable' } },
        { terms: { "location_details.time.label": ['enable', 'open'] } },
        { term: { "provider_details.time.label": 'enable' } },
        { term: { type: 'item' } }
      );
  
      // Add dynamic filters
      if (searchRequest.domain) {
        filterQuery.push({ term: { "context.domain": searchRequest.domain } });
      }
  
      // Main query
      let query_obj = {
        bool: {
          filter: filterQuery,
        },
      };
  
      // Execute search with aggregations
      const totalCategories = await client.search({
        index: "items",
        size: 0, // We don't need actual documents, only aggregation results
        query: query_obj,
        aggs: {
          domainCategories: {
            terms: {
              field: "context.domain",
              size: 10000, // Adjust the size as needed
            },
            aggs: {
              uniqueCategories: {
                terms: {
                  field: "item_details.category_id",
                  size: 10000, // Adjust the size as needed
                },
              },
            },
          },
        },
      });
  
      // Check if aggregations exist in the response
      if (!totalCategories.aggregations || !totalCategories.aggregations.domainCategories) {
        throw new Error("Missing aggregations in Elasticsearch response.");
      }
  
      const domainBuckets = totalCategories.aggregations.domainCategories.buckets;
      let result = {};
  
      // Process and structure the results
      domainBuckets.forEach(domainBucket => {
        const domainName = domainBucket.key;
        let uniqueCategories = domainBucket.uniqueCategories.buckets.map(category => ({
          code: category.key,
          label: category.key,
          url: CATEGORIES[category.key] || null, // Handle undefined URLs
        }));
  
        // Filter out categories without URLs
        uniqueCategories = uniqueCategories.filter(category => category.url);
        result[domainName] = uniqueCategories;
      });
  
      // Return null if no domain buckets are found
      if (domainBuckets.length === 0) {
        return null;
      }
  
      return result;
  
    } catch (error) {
      console.error("Error in getUniqueCategories:", {
        error: error.message,
        stack: error.stack,
        searchRequest,
        targetLanguage
      });
      throw error; // Re-throw the error for the caller to handle
    }
  }

  async getAttributesValues(searchRequest) {
    try {
    
      let filterQuery = [];
  
      // Add static filters
      filterQuery.push(
        { term: { "item_details.time.label": 'enable' } },
        { term: { type: 'item' } }
      );
  
      // Add dynamic filters
      if (searchRequest.category) {
        filterQuery.push({ term: { "item_details.category_id": searchRequest.category } });
      }
      if (searchRequest.providerId) {
        filterQuery.push({ term: { "provider_details.id": searchRequest.providerId } });
      }
  
      // Create the nested query based on the provided attribute key
      let attributeQuery = {
        nested: {
          path: "attribute_key_values",
          query: {
            bool: {
              filter: [
                { term: { "attribute_key_values.key": searchRequest.attribute_code } }
              ]
            }
          }
        }
      };
  
      // Combine all the queries
      const response = await client.search({
        index: 'items',
        body: {
          size: 0, // We don't need actual documents, only aggregation results
          query: {
            bool: {
              filter: filterQuery,
              must: [attributeQuery]
            }
          },
          aggs: {
            unique_attribute_values: {
              nested: {
                path: "attribute_key_values"
              },
              aggs: {
                filtered_attribute: {
                  filter: {
                    term: {
                      "attribute_key_values.key": searchRequest.attribute_code
                    }
                  },
                  aggs: {
                    unique_values: {
                      terms: {
                        field: "attribute_key_values.value",
                        size: 1000  // Adjust the size as needed
                      }
                    }
                  }
                }
              }
            }
          }
        }
      });
  
      // Access the aggregation results correctly
      const uniqueValues = response.aggregations?.unique_attribute_values?.filtered_attribute?.unique_values?.buckets?.map(
        (bucket) => bucket.key
      ) || [];
  
      // Return the result
      return {
        response: {
          data: uniqueValues,
          count: uniqueValues.length
        }
      };
  
    } catch (err) {
      console.error('Error in getAttributesValues:', {
        error: err.message,
        stack: err.stack,
        searchRequest
      });
      throw err; // Re-throw the error for the caller to handle
    }
  }

  async getLocations(searchRequest, targetLanguage = "en") {
    try {
        // Match queries for filtering
        let matchQuery = [
            { match: { language: targetLanguage } },
            { match: { type: 'item' } }
        ];

        matchQuery.push({
          terms: {
            "location_details.time.label": ['enable','open'],
          },
        });
        matchQuery.push({
          match: {
            "provider_details.time.label": 'enable',
          },
        });

        if (searchRequest.domain) {
            matchQuery.push({ match: { "context.domain": searchRequest.domain } });
        }

        let query_obj = {
            function_score: {
                query: {
                    bool: {
                        must: matchQuery,
                        should: [
                            {
                                geo_shape: {
                                    "location_details.polygons": {
                                        shape: {
                                            type: "point",
                                            coordinates: [
                                                parseFloat(searchRequest.latitude),
                                                parseFloat(searchRequest.longitude),
                                            ],
                                        }
                                    }
                                }
                            },
                            {
                                match: {
                                    "location_details.type": "pan",
                                }
                            }
                        ],
                        minimum_should_match: 1
                    }
                },
                functions: [
                    {
                        filter: {
                            geo_shape: {
                                "location_details.polygons": {
                                    shape: {
                                        type: "point",
                                        coordinates: [
                                            parseFloat(searchRequest.latitude),
                                            parseFloat(searchRequest.longitude),
                                        ],
                                    }
                                }
                            }
                        },
                        weight: 2 // Boost for geo_shape matches
                    },
                    {
                        filter: {
                            match: {
                                "location_details.type": "pan",
                            }
                        },
                        weight: 0.5 // Lower boost for match type
                    }
                ],
                score_mode: "sum",
                boost_mode: "multiply"
            }
        };

        // Perform the Elasticsearch search with sorting by _score
        let queryResults = await client.search({
            index: 'items', // Replace with your index name
            body: {
                query: query_obj,
                sort: [
                    { "_score": { "order": "desc" } } // Prioritize based on score
                ],
                aggs: {
                    "unique_location": {
                        composite: {
                            size: searchRequest.limit,
                            sources: [
                                { location_id: { terms: { field: "location_details.id" } } }
                            ],
                            after: searchRequest.afterKey ? { location_id: searchRequest.afterKey } : undefined
                        },
                        "aggs": {
                            "top_products": {
                                "top_hits": {
                                    "size": 1,
                                    "sort": [
                                        { "location_details.median_time_to_ship": { "order": "asc" } }
                                    ],
                                }
                            },
                            "location_time_to_ship": {
                                "min": {
                                    "field": "location_details.median_time_to_ship"
                                }
                            },
                            "sorted_buckets": {
                                "bucket_sort": {
                                    "sort": [
                                        { "location_time_to_ship": { "order": "asc" } }
                                    ]
                                }
                            }
                        }
                    },
                    "unique_location_count": {
                        "cardinality": {
                            "field": "location_details.id"
                        }
                    }
                },
                //size: 0 // We don't need hits, just aggregations
            }
        });

        // Extract unique locations from aggregation results
        let unique_locations = queryResults.aggregations.unique_location.buckets.map(bucket => {
            const details = bucket.top_products.hits.hits[0]._source;
            return {
                domain: details.context.domain,
                provider_descriptor: details.provider_details.descriptor,
                provider: details.provider_details.id,
                ...details.location_details,
            };
        });

        // Get total count and pagination details
        let totalCount = queryResults.aggregations.unique_location_count.value;
        let totalPages = Math.ceil(totalCount / searchRequest.limit);
        let afterKey = queryResults.aggregations.unique_location.after_key;

        // Return the response with count, data, afterKey, and pages
        return {
            count: totalCount,
            data: unique_locations,
            afterKey: afterKey,
            pages: totalPages,
        };

    } catch (err) {
        throw err;
    }
}

async getLocationsNearest(searchRequest, targetLanguage = "en") {
  try {
      function haversineDistance(lat1, lon1, lat2, lon2) {
          const toRadians = (degree) => degree * Math.PI / 180;
          const R = 6371; // Radius of the Earth in km
          const dLat = toRadians(lat2 - lat1);
          const dLon = toRadians(lon2 - lon1);
          const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
                    Math.sin(dLon / 2) * Math.sin(dLon / 2);
          const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
          return (R * c) * 1.4; // Distance in km * 1.4 approximate routing distance
      };

      // Match queries for filtering common conditions
      let matchQuery = [
          { match: { language: targetLanguage } },
          { match: { type: 'item' } }
      ];

      if (searchRequest.domain) {
          matchQuery.push({ match: { "context.domain": searchRequest.domain } });
      }

      if (searchRequest.provider) {
          matchQuery.push({ match: { "provider_details.id": searchRequest.provider } });
      }

      let TTS = 24 * 3600; // ie. 60 hours

      if (!searchRequest.limitExtended) {
        searchRequest.limitExtended = 1000;
      }

      // Aggregation query with sorting by median_time_to_ship
      let aggr_query = {
          unique_location: {
              composite: {
                  size: 100,
                  sources: [
                      { location_id: { terms: { field: "location_details.id" } } }
                  ],
                  after: searchRequest.afterKey ? { location_id: searchRequest.afterKey } : undefined
              },
              aggs: {
                  products: {
                      top_hits: {
                          size: 1,
                  //         sort: [
                  //             { "location_details.median_time_to_ship": { order: "asc" } }
                  //         ]
                      }
                  }
              }
          },
          unique_location_count: {
              cardinality: {
                  field: "location_details.id"
              }
          }
      };

      let serviceabilityFilter = [
          {
              bool: {
                  should: [
                      {
                          geo_shape: {
                              "location_details.polygons": {
                                  relation: "intersects",
                                  shape: {
                                      type: "point",
                                      coordinates: [
                                          parseFloat(searchRequest.latitude),
                                          parseFloat(searchRequest.longitude),
                                      ],
                                  },
                              },
                          },
                      },
                  ],
              },
          },
      ];

      // First query: Results within 5km
      let queryTTSLess = {
          bool: {
              must: [
                  ...matchQuery,
                  {
                      range: {
                          "location_details.median_time_to_ship": {
                              lte: TTS // 24 hours in seconds
                          }
                      }
                  }
              ],
              filter: serviceabilityFilter
          }
      };

      // Perform the Elasticsearch search for within 5km
      let resultsTTSLess = await client.search({
          index: 'items', // specify your index name
          body: {
              query: queryTTSLess,
              aggs: aggr_query,
              size: 0
          }
      });

   
      // Extract and process hits from both query results
      let hitsWithinTTS = resultsTTSLess.aggregations.unique_location.buckets.map(bucket => {
          const details = bucket.products.hits.hits[0]._source;
          if (details.location_details.circle && details.location_details.circle.gps) {
              const [lat, lon] = details.location_details.circle.gps.split(',').map(parseFloat);
              const distance = haversineDistance(
                  parseFloat(searchRequest.latitude),
                  parseFloat(searchRequest.longitude),
                  lat,
                  lon
              );
              return {
                  domain: details.context.domain,
                  provider_descriptor: { name: details.provider_details.descriptor.name, symbol: details.provider_details.descriptor.symbol, images: details.provider_details.descriptor.images },
                  provider: details.provider_details.id,
                  location: details.location_details.id,
                  distance: distance,
                  distance_time_to_ship: ((distance * 60) / 15) + (details.location_details.median_time_to_ship / 60),
                  median_time_to_ship: details.location_details.median_time_to_ship,
                  timeToShip: details.location_details.time_to_ship
              };
          } else {
              return null; // Exclude results without GPS data
          }
      }).filter(result => result !== null) // Remove null entries
      .sort((a, b) => a.distance_time_to_ship - b.distance_time_to_ship);; // Remove null entries

      // Merge results
      let allResults = [...hitsWithinTTS];

      // Get the unique provider count from both results
      let totalCount = resultsTTSLess.aggregations.unique_location_count.value 

      // Return the combined results
      return {
          count: totalCount,
          data: allResults.slice(0, 20),
          pages: null,
          afterKey: { location_id: "location_id" } // to make web UI backward compatible
      };
  } catch (err) {
      console.error(err); // Log the error for debugging
      throw err;
  }
}


async getGlobalProviders(searchRequest, targetLanguage = "en") {
  try {
    console.log("searchRequest", searchRequest);

    let matchQuery = [];
    matchQuery.push({
      match: {
        "item_details.time.label": 'enable',
      },
    });
    matchQuery.push({
      terms: {
        "location_details.time.label": ['enable','open'],
      },
    });
    matchQuery.push({
      match: {
        "provider_details.time.label": 'enable',
      },
    });
    matchQuery.push({
      match: {
        "in_stock": true
      },
    });
    matchQuery.push({ exists: { field: "item_details" } })

    let shouldQuery = [

    ]

    if(searchRequest.subcategory){
      shouldQuery.push({
        "match": {
          "item_details.category_id": searchRequest.subcategory
        }
      })
    }

    if(searchRequest.category){
      shouldQuery.push({
        "match": {
          "context.domain": searchRequest.category
        }
      })
    }

    if(searchRequest.name){
      shouldQuery.push({
        "match": {
          "provider_details.descriptor.name": searchRequest.name
        }
      })
      shouldQuery.push({
        "match": {
          "item_details.descriptor.name": searchRequest.name
        },
      })
      // {
      //   "wildcard": {
      //     "item_details.descriptor.short_desc": `*${searchRequest.name}*`
      //   },
      // },
      // {
      //   "wildcard": {
      //     "item_details.descriptor.long_desc":`*${searchRequest.name}*`
      //   },
      // },
      shouldQuery.push({
        "match": {
          "item_details.category_id": searchRequest.name
        },
      })
    }

    // Set the timezone to Asia/Kolkata (IST)
    const timezone = 'Asia/Kolkata';

    // Get the current time in the specified timezone
    const today = moment().tz(timezone);
    
    // Get the current day of the week (1 = Monday, ..., 7 = Sunday)
    const currentDay = today.day() === 0 ? 7 : today.day(); // Adjusting for Sunday
    
     // Get the current time in hours and minutes
    const hours = today.hours().toString().padStart(2, '0');
    const minutes = today.minutes().toString().padStart(2, '0');
    const currentTime = parseInt(hours + minutes, 10);
    
    console.log(`Current Day: ${currentDay}`);
    console.log(`Current Time: ${currentTime}`);

    // Base query object with additional filters
    let query_obj = {
      function_score: {
        query: {
          bool: {
            must: [
              {
                bool: {
                  must: matchQuery,
                  should: shouldQuery,
                  minimum_should_match: 1
                },
              },
              // Default language search
              {
                match: {
                  language: targetLanguage,
                },
              },
              {
                bool: {
                  should: [
                    {
                      match: {
                        "location_details.type": "pan",
                      },
                    },
                    {
                      geo_shape: {
                        "location_details.polygons": {
                          shape: {
                            type: "point",
                            coordinates: [
                              parseFloat(searchRequest.latitude),
                              parseFloat(searchRequest.longitude),
                            ],
                          },
                        },
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
        functions: [
          {
            filter: {
              bool: {
                must_not: {
                  nested: {
                    path: `location_availabilities.${currentDay}`,
                    query: {
                      bool: {
                        must: [
                          { range: { [`location_availabilities.${currentDay}.start`]: { lte: currentTime } } },
                          { range: { [`location_availabilities.${currentDay}.end`]: { gte: currentTime } } }
                        ]
                      }
                    }
                  }
                }
              }
            },
            weight: 10000000 // High weight for documents not matching the filter
          },
          {
            filter: {
              nested: {
                path: `location_availabilities.${currentDay}`,
                query: {
                  bool: {
                    should: [
                      {
                        bool: {
                          must: [
                            { range: { [`location_availabilities.${currentDay}.start`]: { lte: currentTime } } },
                            { range: { [`location_availabilities.${currentDay}.end`]: { gte: currentTime } } }
                          ]
                        }
                      }
                    ]
                  }
                }
              }
            },
            weight: 0 // Low weight for documents matching the filter
          },
          // New filter for inStock
          {
            filter: {
              term: {
                "in_stock": true
              }
            },
            weight: 10 // High weight for in-stock items
          },
          {
            filter: {
              bool: {
                must_not: {
                  term: {
                    "in_stock": true
                  }
                }
              }
            },
            weight: 0 // Low weight for out-of-stock items
          },
          {
            filter: {
                bool: {
                    must_not: {
                        range: {
                            "enable_percentage": {
                                gte: 80 //TODO: make it configurable
                            }
                        }
                    }
                }
            },
            weight: 0 // Weight for documents where enable_percentage is < 100
        },
        {
          filter: {
              bool: {
                  must: {
                      range: {
                          "enable_percentage": {
                              gte: 80 //TODO: make it configurable
                          }
                      }
                  }
              }
          },
          weight: 10 // Weight for documents where enable_percentage is < 100
      },
        ],
        score_mode: "sum", // Combine scores from all functions
        boost_mode: "replace" // Replace the final score with the score calculated by the functions
      }
    };

    // Define the aggregation query
    let aggr_query = {
      unique_providers: {
        composite: {
          size: searchRequest.limit,
          sources: [
            { provider_id: { terms: { field: "location_details.id" } } }
          ],
          after: searchRequest.afterKey ? { provider_id: searchRequest.afterKey } : undefined
        },
        aggs: {
          products: {
            top_hits: {
              size: 10,
            }
          }
        }
      },
      unique_provider_count: {
        cardinality: {
          field: "location_details.id"
        }
      }
    };

    // Perform the search query with the defined query and aggregation
    let queryResults = await client.search({
      body: {
        query: query_obj,
        aggs: aggr_query,
        size: 0,
      }
    });

    // Extract unique providers from the aggregation results
    let unique_providers = queryResults.aggregations.unique_providers.buckets.map(bucket => {
      let minDays = 0;
      if (searchRequest.pincode) {
        let docPincode = bucket.products.hits.hits[0]._source.location_details.address.area_code;
        let matchCount = 0;
        for (let i = 0; i < searchRequest.pincode.length; i++) {
          if (i < docPincode.length && searchRequest.pincode.charAt(i) == docPincode.charAt(i)) {
            matchCount++;
          } else {
            break;
          }
        }
        if (matchCount == 6) minDays = 15 * 60;
        else if (matchCount == 5) minDays = 30 * 60;
        else if (matchCount == 4) minDays = 45 * 60;
        else if (matchCount == 3) minDays = 60 * 60;
        else if (matchCount == 2) minDays = 1440 * 60;
        else if (matchCount == 1) minDays = 1440 * 60;
        else minDays = 10080 * 60; // other state
      }

      return {
        ...bucket.products.hits.hits[0]._source.provider_details,
        minDays,
        minDaysWithTTS: minDays + bucket.products.hits.hits[0]._source.location_details.median_time_to_ship,
        items: bucket.products.hits.hits.map((hit) => hit._source)
      };
    });

    // Get the unique provider count
    let totalCount = queryResults.aggregations.unique_provider_count.value;
    let totalPages = Math.ceil(totalCount / searchRequest.limit);

    // Get the after key for pagination
    let afterKey = queryResults.aggregations.unique_providers.after_key;

    // Return the response with count, data, afterKey, and pages
    return {
      response: {
        count: totalCount,
        data: unique_providers,
        afterKey: afterKey,
        pages: totalPages,
      }
    };

  } catch (err) {
    console.error("Error executing search query:", err);
    throw err;
  }
}

// async getProviders(searchRequest, targetLanguage = "en") {
//   try {
//     let filterArray = [];
//     let limit = parseInt(searchRequest.limit) || 10;

//     filterArray.push({
//       geo_distance: {
//         distance: searchRequest.distance || '10km',
//         "location_details.gps": {
//           lat: parseFloat(searchRequest.latitude),
//           lon: parseFloat(searchRequest.longitude),
//         },
//       },
//     });

//     // Main query
//     let query_obj = {
//       bool: {
//         must: [
//           { match: { language: targetLanguage } },
//           { match: { type: "item" } },
//           { match: { "item_details.time.label": "enable" } },
//           { terms: { "location_details.time.label": ["enable", "open"] } },
//           { match: { "provider_details.time.label": "enable" } },
//           ...(searchRequest.name ? [
//             {
//               bool: {
//                 should: [
//                   { match_phrase: { "provider_details.descriptor.name": { query: searchRequest.name, slop: 1, boost: 3 } } },
//                   { match: { "provider_details.descriptor.name": { query: searchRequest.name, fuzziness: "AUTO", prefix_length: 2, operator: "OR", boost: 2 } } }
//                 ],
//                 minimum_should_match: 1
//               }
//             }
//           ] : []),
//           ...(searchRequest.domain ? [{ match: { "context.domain": searchRequest.domain } }] : [])
//         ],
//         filter: filterArray
//       }
//     };

//     // Aggregation setup for unique providers and unique locations using geohash_grid
//     let aggr_query = {
//       unique_providers: {
//         composite: {
//           size: limit,
//           sources: [{ provider_id: { terms: { field: "provider_details.id" , order: "asc" } } }],
//           after: searchRequest.afterKey ? { provider_id: searchRequest.afterKey } : undefined
//         },
//         aggs: {
//           unique_locations: {
//             geohash_grid: {
//               field: "location_details.gps",
//               precision: 5, // Adjust precision for location clustering
//               size: 100  // Limit number of locations per provider
//             },
//             aggs: {
//               location_details: {
//                 top_hits: {
//                   _source: ["location_details.*"], // Include location details
//                   size: 1
//                 }
//               }
//             }
//           },
//           products: {
//             top_hits: {
//               _source: ["provider_details.*", "fulfillment_details.*"],
//               size: 1, // Only need one instance of provider details
//             }
//           }
//         }
//       },
//       unique_provider_count: {
//         cardinality: {
//           field: "provider_details.id",
//         },
//       }
//     };

//     const queryResults = await client.search({
//       body: {
//         query: query_obj,
//         aggs: aggr_query,
//         size: 0,
//         // track_total_hits: true,
//         // timeout: '30s'
//       },
//     });

//     // Process results
//     const buckets = queryResults.aggregations?.unique_providers?.buckets || [] 
//     const unique_providers = buckets.map((bucket) => {
//       const providerDetails = bucket.products?.hits?.hits[0]?._source?.provider_details;
//       const uniqueLocations = bucket.unique_locations?.buckets?.map(locBucket => locBucket.location_details?.hits?.hits[0]?._source?.location_details);

//       return {
//         provider_details: providerDetails,
//         locations: uniqueLocations || []
//       };
//     });

//     const totalCount = queryResults.aggregations.unique_provider_count.value || 0;
//     const totalPages = Math.ceil(totalCount / limit);
//     const afterKey = queryResults?.aggregations?.unique_providers?.after_key;

//     return {
//       response: {
//         count: totalCount,
//         data: unique_providers,
//         afterKey: afterKey,
//         pages: totalPages,
//       },
//     };

//   } catch (err) {
//     console.error('Error in getProviders:', {
//       error: err.message,
//       stack: err.stack
//     });
//     throw err;
//   }
// }

async getProviders(searchRequest, targetLanguage = "en") {
  try {
  
    let filterArray = [];
    let limit = parseInt(searchRequest.limit) || 10;

    // Add geo distance filter
    filterArray.push({
      geo_distance: {
        distance: searchRequest.distance || '10km',
        "location_details.gps": {
          lat: parseFloat(searchRequest.latitude),
          lon: parseFloat(searchRequest.longitude),
        },
      },
    });

    // Main query
    let query_obj = {
      bool: {
        filter: [
          { term: { language: targetLanguage } },
          { term: { type: "item" } },
          { term: { "item_details.time.label": "enable" } },
          { terms: { "location_details.time.label": ["enable", "open"] } },
          { term: { "provider_details.time.label": "enable" } },
          ...(searchRequest.name ? [
            {
              bool: {
                should: [
                  { match_phrase: { "provider_details.descriptor.name": { query: searchRequest.name, slop: 1, boost: 3 } } },
                  { match: { "provider_details.descriptor.name": { query: searchRequest.name, fuzziness: "AUTO", prefix_length: 2, operator: "OR", boost: 2 } } }
                ],
                minimum_should_match: 1
              }
            }
          ] : []),
          ...(searchRequest.domain ? [{ term: { "context.domain": searchRequest.domain } }] : [])
        ],
        must: filterArray
      }
    };

    // Aggregation setup for unique providers and unique locations using geohash_grid
    let aggr_query = {
      unique_providers: {
        composite: {
          size: limit,
          sources: [{ provider_id: { terms: { field: "provider_details.id", order: "asc" } } }],
          after: searchRequest.afterKey ? { provider_id: searchRequest.afterKey } : undefined
        },
        aggs: {
          unique_locations: {
            geohash_grid: {
              field: "location_details.gps",
              precision: 5, // Adjust precision for location clustering
              size: 100  // Limit number of locations per provider
            },
            aggs: {
              location_details: {
                top_hits: {
                  _source: ["location_details.*"], // Include location details
                  size: 1
                }
              }
            }
          },
          products: {
            top_hits: {
              _source: ["provider_details.*", "fulfillment_details.*"],
              size: 1, // Only need one instance of provider details
            }
          }
        }
      },
      unique_provider_count: {
        cardinality: {
          field: "provider_details.id",
        },
      }
    };

    const queryResults = await client.search({
      body: {
        query: query_obj,
        aggs: aggr_query,
        size: 0,
        track_total_hits: true,
        timeout: '30s'
      },
    });

    // Process results
    const buckets = queryResults.aggregations?.unique_providers?.buckets || [];
    const unique_providers = buckets.map((bucket) => {
      const providerDetails = bucket.products?.hits?.hits[0]?._source?.provider_details;
      const uniqueLocations = bucket.unique_locations?.buckets?.map(locBucket => locBucket.location_details?.hits?.hits[0]?._source?.location_details);

      return {
        provider_details: providerDetails,
        locations: uniqueLocations || []
      };
    });

    const totalCount = queryResults.aggregations.unique_provider_count.value || 0;
    const totalPages = Math.ceil(totalCount / limit);
    const afterKey = queryResults?.aggregations?.unique_providers?.after_key;

    return {
      response: {
        count: totalCount,
        data: unique_providers,
        afterKey: afterKey,
        pages: totalPages,
      },
    };

  } catch (err) {
    console.error('Error in getProviders:', {
      error: err.message,
      stack: err.stack,
      searchRequest,
      targetLanguage
    });
    throw err; // Re-throw the error for the caller to handle
  }
}

  async getProviders1(indexName, pageSize, afterKey = null) {
    const body = {
      size: 0, // We don't need the actual documents, only the aggregation results
      aggs: {
        unique_provider_ids: {
          composite: {
            size: 20,
            sources: [
              { provider_id: { terms: { field: 'provider_details.id' } } }
            ]
          }
        }
      }
    };

    // If afterKey is provided, add it to the request body
    if (afterKey) {
      body.aggs.unique_provider_ids.after = afterKey;
    }

    const { body: response } = await client.search({
      body
    });

    return response.aggregations.unique_provider_ids;
  }

  async getCustomMenu(searchRequest, targetLanguage = "en") {
    try {
      let matchQuery = [];

      matchQuery.push({
        match: {
          language: targetLanguage,
        },
      });

      matchQuery.push({
        match: {
          "type": 'item',
        },
      })

      if (searchRequest.provider) {
        matchQuery.push({
          match: {
            "provider_details.id": searchRequest.provider,
          },
        });
      }

      let queryResults = await client.search({
        query: {
          bool: {
            must: [
              {
                term: {
                  "provider_details.id": searchRequest.provider,
                },
              },
            ],
          },
        },
        aggs: {
          unique_menus: {
            nested: {
              path: "customisation_menus",
            },
            aggs: {
              filtered_menus: {
                terms: {
                  field: "customisation_menus.id",
                },
                aggs: {
                  menu_details: {
                    top_hits: {
                      size: 1,
                    },
                  },
                },
              },
            },
          },
        },
      });

      let customisationMenus = [];
      const buckets =
        queryResults.aggregations.unique_menus.filtered_menus.buckets;

      buckets.forEach((bucket) => {
        const menuDetails = bucket.menu_details.hits.hits.map(
          (hit) => hit._source,
        )[0];
        customisationMenus.push(menuDetails);
      });
      console.log("Unique IDs with documents:", customisationMenus);
      return {
        data: customisationMenus,
        count: customisationMenus.length,
        pages: customisationMenus.length,
      };
    } catch (err) {
      throw err;
    }
  }

  async getOffers(searchRequest, targetLanguage = "en") {
    try {
      let matchQuery = [];
      let searchQuery = [];

      matchQuery.push({
        match: {
          language: targetLanguage,
        },
      });

      searchQuery.push({
        match: {
          "location_details.type": "pan",
        },
      });

      if (searchRequest.latitude && searchRequest.longitude)
        searchQuery.push({
          geo_shape: {
            "location_details.polygons": {
              shape: {
                type: "point",
                coordinates: [
                  parseFloat(searchRequest.latitude),
                  parseFloat(searchRequest.longitude),
                ],
              },
            },
          },
        });

      if (searchRequest.provider) {
        matchQuery.push({
          match: {
            "provider_details.id": searchRequest.provider,
          },
        });
      }
      if (searchRequest.location) {
        matchQuery.push({
          match: {
            "location_details.id": searchRequest.location,
          },
        });
      }
      let queryResults = await client.search({
        index: 'offers',
        query: {
          bool: {
            must: matchQuery,
            should: searchQuery,
            minimum_should_match: 1
          },
        },
        size: 20
      });

      // Extract the _source field from each hit
      let sources = queryResults.hits.hits.map((hit) => {
        return { ...hit._source, provider: hit._source.provider_details.id, provider_descriptor: hit._source.provider_details.descriptor, location: hit._source.location_details.id, domain: hit._source.context.domain, id: hit._source.local_id };
      });

      // Get the total count of results
      let totalCount = queryResults.hits.total.value;

      // Return the total count and the sources
      return {
        response: {
          count: totalCount,
          data: sources,
        },
      };


    } catch (err) {
      throw err;
    }
  }
  async servieablelocations(searchRequest, targetLanguage = "en") {
    try {
        const page = searchRequest.page ? parseInt(searchRequest.page, 10) : 0;
        const limit = searchRequest.limit ? parseInt(searchRequest.limit, 10) : 10;

        if (isNaN(page) || page < 0) throw new Error("Invalid page number");
        if (isNaN(limit) || limit <= 0) throw new Error("Invalid limit");

        // Set the timezone to Asia/Kolkata (IST)
        const timezone = 'Asia/Kolkata';

        // Get the current time in the specified timezone
        const today = moment().tz(timezone);

        // Get the current day of the week (1 = Monday, ..., 7 = Sunday)
        const currentDay = today.day() === 0 ? 7 : today.day(); // Adjusting for Sunday

        // Get the current time in hours and minutes
        const hours = today.hours().toString().padStart(2, '0');
        const minutes = today.minutes().toString().padStart(2, '0');
        const currentTime = parseInt(hours + minutes, 10);

        console.log(`Current Day: ${currentDay}`);
        console.log(`Current Time: ${currentTime}`);
  

        let matchQuery = [];
        if (searchRequest.domain) {
            matchQuery.push({ match: { "context.domain": searchRequest.domain } });
        }
        matchQuery.push({
          match: {
            language: targetLanguage,
          },
        });
        matchQuery.push({
          terms: {
            "location_details.time.label": ['enable','open'],
          },
        });
        matchQuery.push({
          match: {
            "provider_details.time.label": 'enable',
          },
        });

        if(searchRequest.providerId){
          matchQuery.push({
            match: {
              "provider_details.id": searchRequest.providerId,
            },
          });
        }


        matchQuery.push({exists: { field: "location_details.address.area_code" } })

        let query_obj = {
          function_score: {
              query: {
                  bool: {
                      must: matchQuery,
                      should: [
                          {
                              geo_shape: {
                                  "location_details.polygons": {
                                      shape: {
                                          type: "point",
                                          coordinates: [
                                              parseFloat(searchRequest.latitude),
                                              parseFloat(searchRequest.longitude),
                                          ]
                                      }
                                  }
                              }
                          },
                          {
                              match: {
                                  "location_details.type": "pan",
                              }
                          }
                      ],
                      minimum_should_match: 1
                  }
              },
              functions: [
                {
                  filter: {
                      nested: {
                          path: `availability.${currentDay}`,
                          query: {
                              bool: {
                                  should: [
                                      {
                                          bool: {
                                              must: [
                                                  { range: { [`availability.${currentDay}.start`]: { lte: currentTime } } },
                                                  { range: { [`availability.${currentDay}.end`]: { gte: currentTime } } }
                                              ]
                                          }
                                      }
                                  ]
                              }
                          }
                      }
                  },
                  weight: 0 // Low weight for documents matching the filter
              },
              {
                filter: {
                    bool: {
                        must_not: {
                            range: {
                                "enable_percentage": {
                                    gte: 80 //TODO: make it configurable
                                }
                            }
                        }
                    }
                },
                weight: 10000000 // Weight for documents where enable_percentage is < 100
            },
            {
              filter: {
                  bool: {
                      must: {
                          range: {
                              "enable_percentage": {
                                  gte: 80 //TODO: make it configurable
                              }
                          }
                      }
                  }
              },
              weight: 0 // Weight for documents where enable_percentage is < 100
          },
              {
                filter: {
                    bool: {
                        must_not: {
                            nested: {
                                path: `availability.${currentDay}`,
                                query: {
                                    bool: {
                                        must: [
                                            { range: { [`availability.${currentDay}.start`]: { lte: currentTime } } },
                                            { range: { [`availability.${currentDay}.end`]: { gte: currentTime } } }
                                        ]
                                    }
                                }
                            }
                        }
                    }
                },
                weight: 10000000 // High weight for documents not matching the filter
            },
            
                  {
                      script_score: {
                          script: {
                              source: `
                                  String inputPincode = params.inputPincode;
                                  String docPincode = doc.containsKey('location_details.address.area_code') ? doc['location_details.address.area_code'].value : '';
                                  int matchCount = 0;
      
                                  for (int i = 0; i < inputPincode.length(); i++) {
                                      if (i < docPincode.length() && inputPincode.charAt(i) == docPincode.charAt(i)) {
                                          matchCount++;
                                      } else {
                                          break;
                                      }
                                  }
      
                                  int minDays;
                                  if (matchCount == 6) minDays = 15*60;
                                  else if (matchCount == 5) minDays = 30*60;
                                  else if (matchCount == 4) minDays = 45*60;
                                  else if (matchCount == 3) minDays = 60*60;
                                  else if (matchCount == 2) minDays = 1440*60;
                                  else if (matchCount == 1) minDays = 1440*60;
                                  else minDays = 10080*60;
      
                                  return (doc.containsKey('location_details.median_time_to_ship') ? doc['location_details.median_time_to_ship'].value + minDays : minDays);
                              `,
                              params: {
                                  inputPincode: searchRequest.pincode
                              }
                          }
                      }
                  }
              ],
              score_mode: "sum", // Combine scores from all functions
              boost_mode: "replace" // Replace the final score with the score calculated by the functions
          }
      };
      
      

        let queryResults = await client.search({
            index: 'locations',
            body: {
                query: query_obj,
                sort: [
                    { "_score": { "order": "asc" } }
                ],
                from: page * limit,
                size: limit
            }
        });

        let locations = queryResults.hits.hits.map(hit => {
            const source = hit._source || {};
            let docPincode = source.location_details.address.area_code;
            let matchCount = 0;
            for (let i = 0; i < searchRequest.pincode.length; i++) {
              if (i < docPincode.length && searchRequest.pincode.charAt(i) == docPincode.charAt(i)) {
                matchCount++;
              }else {
                break;
            }
            }

            let minDays;
            if (matchCount == 6) minDays = 15*60;
            else if (matchCount == 5) minDays = 30*60;
            else if (matchCount == 4) minDays = 45*60;
            else if (matchCount == 3) minDays = 60*60;
            else if (matchCount == 2) minDays = 1440*60;
            else if (matchCount == 1) minDays = 1440*60;
            else minDays = 10080*60; //other state

            return {
                minDays : minDays,
                minDaysWithTTS : minDays + source.location_details.median_time_to_ship,
                domain: source.context.domain,
                provider_descriptor:source.provider_details.descriptor,
                provider: source.provider_details.id,
                ...source.location_details,
                calculated_score: hit._score,
                availability:source.availability

            };
        }).filter(item => item !== null);

        let totalCount = queryResults.hits.total.value;
        let totalPages = Math.ceil(totalCount / limit);

        return {
            count: totalCount,
            data: locations,
            pages: totalPages
        };

    } catch (err) {
        console.error("Error executing search query:", err);
        throw err;
    }
}

}

export default SearchService;
