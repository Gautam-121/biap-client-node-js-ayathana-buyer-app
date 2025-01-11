// [
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 0 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 1 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 2 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 3 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 4 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 5 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 6 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 7 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 8 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 9 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 10 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 11 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 12 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 13 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 14 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 15 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 16 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 17 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 18 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 19 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 20 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'",
//     "Error at message -> catalog -> bpp/providers -> 0 -> items -> 21 -> tags -> 1 -> list -> 0 -> value: Colour value should start with '#'"
// ]

// [
//     {
//         'loc': ('message', 'catalog', 'bpp/providers'), 
//         'msg': 'ensure this value has at least 1 items', 
//         'type': 'value_error.list.min_items', 
//         'ctx': {'limit_value': 1}
//     }
// ]

// [
//     {
//         'loc': ('message', 'catalog', 'bpp/providers', 0, 'items', 1, 'tags', 3, 'list', 1, 'value'), loc!= "items"
//         'msg': 'field required', 
//         'type': 'value_error.missing'
//     }
// ]

// {
//     "type": "BPP-ERROR - 92","PROVIDER-ERROR - 90","ITEM-ERROR - 91" 
//     "code": "9xxx1",
//     "path": "message.catalog", //  error_location = " -> ".join(str(loc) for loc in error.get("loc", []))
//     "message": "item images missing for all the providers" // {error.get('msg', 'Unknown error')}
//   },


// {
//     "context":
//     {
//       "domain":"ONDC:RET12",
//       "country":"IND",
//       "city":"std:080",
//       "action":"on_search",
//       "core_version":"1.2.0",
//       "bap_id":"buyerNP.com",
//       "bap_uri":"https://buyerNP.com/ondc",
//       "bpp_id":"sellerNP.com",
//       "bpp_uri":"https://sellerNP.com/ondc",
//       "transaction_id":"T1",
//       "message_id":"M1",
//       "timestamp":"2023-06-03T08:00:30.000Z"
//     },
//     "message":
//     {
//       "catalog":
//       {
//         "bpp/descriptor":
//         {
//           "name":"Seller NP",
//           "symbol":"https://sellerNP.com/images/np.png",
//           "short_desc":"Seller Marketplace",
//           "long_desc":"Seller Marketplace",
//           "images":
//           [
//             "https://sellerNP.com/images/np.png"
//           ],
//           "tags":
//           [
//             {
//               "code":"bpp_terms",
//               "list":
//               [
//                 {
//                   "code":"np_type",
//                   "value":"MSN"
//                 },
//                 {
//                   "code":"accept_bap_terms",
//                   "value":"Y"
//                 },
//                 {
//                   "code":"collect_payment",
//                   "value":"Y"
//                 }
//               ]
//             }
//           ]
//         },
//         "bpp/providers":
//         [
//           {
//             "id":"P1",
//             "time":
//             {
//               "label":"enable",
//               "timestamp":"2023-06-03T08:00:30.000Z"
//             },
//             "fulfillments":
//             [
//               {
//                 "id":"F1",
//                 "type":"Delivery",
//                 "contact":
//                 {
//                   "phone":"9886098860",
//                   "email":"abc@xyz.com"
//                 }
//               }
//             ],
//             "descriptor":
//             {
//               "name":"Store 1",
//               "symbol":"https://sellerNP.com/images/store1.png",
//               "short_desc":"Store 1",
//               "long_desc":"Store 1",
//               "images":
//               [
//                 "https://sellerNP.com/images/store1.png"
//               ]
//             },
//             "ttl":"P1D",
//             "locations":
//             [
//               {
//                 "id":"L1",
//                 "time":
//                 {
//                   "label":"enable",
//                   "timestamp":"2023-06-03T07:30:30.000Z",
//                   "days":"1,2,3,4,5,6,7",
//                   "schedule":
//                   {
//                     "holidays":
//                     [
//                       "2023-08-15"
//                     ],
//                     "frequency":"PT4H",
//                     "times":
//                     [
//                       "1100",
//                       "1900"
//                     ]
//                   },
//                   "range":
//                   {
//                     "start":"1100",
//                     "end":"2100"
//                   }
//                 },
//                 "gps":"12.967555,77.749666",
//                 "address":
//                 {
//                   "locality":"Jayanagar",
//                   "street":"Jayanagar 4th Block",
//                   "city":"Bengaluru",
//                   "area_code":"560076",
//                   "state":"KA"
//                 },
//                 "circle":
//                 {
//                   "gps":"12.967555,77.749666",
//                   "radius":
//                   {
//                     "unit":"km",
//                     "value":"3"
//                   }
//                 }
//               }
//             ],
//             "categories":
//             [
//               {
//                 "id":"V1",
//                 "descriptor":
//                 {
//                   "name":"Variant Group 1"
//                 },
//                 "tags":
//                 [
//                   {
//                     "code":"type",
//                     "list":
//                     [
//                       {
//                         "code":"type",
//                         "value":"variant_group"
//                       }
//                     ]
//                   },
//                   {
//                     "code":"attr",
//                     "list":
//                     [
//                       {
//                         "code":"name",
//                         "value":"item.tags.attribute.colour"
//                       },
//                       {
//                         "code":"seq",
//                         "value":"1"
//                       }
//                     ]
//                   },
//                   {
//                     "code":"attr",
//                     "list":
//                     [
//                       {
//                         "code":"name",
//                         "value":"item.tags.attribute.size"
//                       },
//                       {
//                         "code":"seq",
//                         "value":"2"
//                       }
//                     ]
//                   }
//                 ]
//               }
//             ],
//             "items":
//             [
//               {
//                 "id":"I1",
//                 "time":
//                 {
//                   "label":"enable",
//                   "timestamp":"2023-06-03T07:30:00.000Z"
//                 },
//                 "parent_item_id":"V1",
//                 "descriptor":
//                 {
//                   "name":"Allen Solly Men T-shirt",
//                   "code":"4:XXXXXXXX",
//                   "symbol":"https://sellerNP.com/images/i1.png",
//                   "short_desc":"Allen Solly Men T-shirt",
//                   "long_desc":"Allen Solly Men T-shirt",
//                   "images":
//                   [
//                     "https://sellerNP.com/images/i1.png"
//                   ]
//                 },
//                 "quantity":
//                 {
//                   "unitized":
//                   {
//                     "measure":
//                     {
//                       "unit":"unit",
//                       "value":"1"
//                     }
//                   },
//                   "available":
//                   {
//                     "count":"99"
//                   },
//                   "maximum":
//                   {
//                     "count":"99"
//                   }
//                 },
//                 "price":
//                 {
//                   "currency":"INR",
//                   "value":"579.00",
//                   "maximum_value":"999.0"
//                 },
//                 "category_id":"T Shirts",
//                 "fulfillment_id":"F1",
//                 "location_id":"L1",
//                 "@ondc/org/returnable":true,
//                 "@ondc/org/cancellable":true,
//                 "@ondc/org/return_window":"P7D",
//                 "@ondc/org/seller_pickup_return":true,
//                 "@ondc/org/time_to_ship":"P1D",
//                 "@ondc/org/available_on_cod":false,
//                 "@ondc/org/contact_details_consumer_care": "Ramesh,ramesh@abc.com,18004254444",
//                 "@ondc/org/statutory_reqs_packaged_commodities":
//                 {
//                   "manufacturer_or_packer_name":"Aditya Birla Fashion & Retail Ltd",
//                   "manufacturer_or_packer_address":"Building 2, Divyasree Technopolis, Off HAL Airport Road, Bengaluru-560037",
//                   "common_or_generic_name_of_commodity":"Polo",
//                   "month_year_of_manufacture_packing_import":"01/2017"
//                 },
//                 "tags":
//                 [
//                   {
//                     "code":"origin",
//                     "list":
//                     [
//                       {
//                         "code":"country",
//                         "value":"IND"
//                       }
//                     ]
//                   },
//                   {
//                     "code":"attribute",
//                     "list":
//                     [
//                       {
//                         "code":"gender",
//                         "value":"male"
//                       },
//                       {
//                         "code":"colour",
//                         "value":"#FF7F50"
//                       },
//                       {
//                         "code":"colour_name",
//                         "value":"Coral"
//                       },
//                       {
//                         "code":"size",
//                         "value":"S"
//                       },
//                       {
//                         "code":"brand",
//                         "value":"Allen Solly"
//                       },
//                       {
//                         "code":"size_chart",
//                         "value":"https://sellerNP.com/images/i1_size_chart.png"
//                       },
//                       {
//                         "code":"fabric",
//                         "value":"cotton"
//                       }
//                     ]
//                   }
//                 ]
//               },
//               {
//                 "id":"I2",
//                 "parent_item_id":"V1",
//                 "descriptor":
//                 {
//                   "name":"Allen Solly Men T-shirt",
//                   "code":"4:XXXXXXXX",
//                   "symbol":"https://sellerNP.com/images/i2.png",
//                   "short_desc":"Allen Solly Men T-shirt",
//                   "long_desc":"Allen Solly Men T-shirt",
//                   "images":
//                   [
//                     "https://sellerNP.com/images/i2.png"
//                   ]
//                 },
//                 "quantity":
//                 {
//                   "unitized":
//                   {
//                     "measure":
//                     {
//                       "unit":"unit",
//                       "value":"1"
//                     }
//                   },
//                   "available":
//                   {
//                     "count":"99"
//                   },
//                   "maximum":
//                   {
//                     "count":"99"
//                   }
//                 },
//                 "price":
//                 {
//                   "currency":"INR",
//                   "value":"538.00",
//                   "maximum_value":"999.0"
//                 },
//                 "category_id":"T Shirts",
//                 "fulfillment_id":"F1",
//                 "location_id":"L1",
//                 "@ondc/org/returnable":true,
//                 "@ondc/org/cancellable":true,
//                 "@ondc/org/return_window":"P7D",
//                 "@ondc/org/seller_pickup_return":true,
//                 "@ondc/org/time_to_ship":"P1D",
//                 "@ondc/org/available_on_cod":false,
//                 "@ondc/org/contact_details_consumer_care": "Ramesh,ramesh@abc.com,18004254444",
//                 "@ondc/org/statutory_reqs_packaged_commodities":
//                 {
//                   "manufacturer_or_packer_name":"Aditya Birla Fashion & Retail Ltd",
//                   "manufacturer_or_packer_address":"Building 2, Divyasree Technopolis, Off HAL Airport Road, Bengaluru-560037",
//                   "common_or_generic_name_of_commodity":"Polo",
//                   "month_year_of_manufacture_packing_import":"01/2017"
//                 },
//                 "tags":
//                 [
//                   {
//                     "code":"origin",
//                     "list":
//                     [
//                       {
//                         "code":"country",
//                         "value":"IND"
//                       }
//                     ]
//                   },
//                   {
//                     "code":"attribute",
//                     "list":
//                     [
//                       {
//                         "code":"gender",
//                         "value":"male"
//                       },
//                       {
//                         "code":"colour",
//                         "value":"#FF7F50"
//                       },
//                       {
//                         "code":"colour_name",
//                         "value":"Coral"
//                       },
//                       {
//                         "code":"size",
//                         "value":"M"
//                       },
//                       {
//                         "code":"brand",
//                         "value":"Allen Solly"
//                       },
//                       {
//                         "code":"size_chart",
//                         "value":"https://sellerNP.com/images/i2_size_chart.png"
//                       },
//                       {
//                         "code":"fabric",
//                         "value":"cotton"
//                       }
//                     ]
//                   }
//                 ]
//               },
//               {
//                 "id":"I3",
//                 "parent_item_id":"V1",
//                 "descriptor":
//                 {
//                   "name":"Allen Solly Men T-shirt",
//                   "code":"4:XXXXXXXX",
//                   "symbol":"https://sellerNP.com/images/i3.png",
//                   "short_desc":"Allen Solly Men T-shirt",
//                   "long_desc":"Allen Solly Men T-shirt",
//                   "images":
//                   [
//                     "https://sellerNP.com/images/i3.png"
//                   ]
//                 },
//                 "quantity":
//                 {
//                   "unitized":
//                   {
//                     "measure":
//                     {
//                       "unit":"unit",
//                       "value":"1"
//                     }
//                   },
//                   "available":
//                   {
//                     "count":"99"
//                   },
//                   "maximum":
//                   {
//                     "count":"99"
//                   }
//                 },
//                 "price":
//                 {
//                   "currency":"INR",
//                   "value":"569.00",
//                   "maximum_value":"999.0"
//                 },
//                 "category_id":"T Shirts",
//                 "fulfillment_id":"F1",
//                 "location_id":"L1",
//                 "@ondc/org/returnable":true,
//                 "@ondc/org/cancellable":true,
//                 "@ondc/org/return_window":"P7D",
//                 "@ondc/org/seller_pickup_return":true,
//                 "@ondc/org/time_to_ship":"P1D",
//                 "@ondc/org/available_on_cod":false,
//                 "@ondc/org/contact_details_consumer_care": "Ramesh,ramesh@abc.com,18004254444",
//                 "@ondc/org/statutory_reqs_packaged_commodities":
//                 {
//                   "manufacturer_or_packer_name":"Aditya Birla Fashion & Retail Ltd",
//                   "manufacturer_or_packer_address":"Building 2, Divyasree Technopolis, Off HAL Airport Road, Bengaluru-560037",
//                   "common_or_generic_name_of_commodity":"Polo",
//                   "month_year_of_manufacture_packing_import":"01/2017"
//                 },
//                 "tags":
//                 [
//                   {
//                     "code":"origin",
//                     "list":
//                     [
//                       {
//                         "code":"country",
//                         "value":"IND"
//                       }
//                     ]
//                   },
//                   {
//                     "code":"attribute",
//                     "list":
//                     [
//                       {
//                         "code":"gender",
//                         "value":"male"
//                       },
//                       {
//                         "code":"colour",
//                         "value":"#FF7F50"
//                       },
//                       {
//                         "code":"colour_name",
//                         "value":"Coral"
//                       },
//                       {
//                         "code":"size",
//                         "value":"L"
//                       },
//                       {
//                         "code":"brand",
//                         "value":"Allen Solly"
//                       },
//                       {
//                         "code":"size_chart",
//                         "value":"https://sellerNP.com/images/i3_size_chart.png"
//                       },
//                       {
//                         "code":"fabric",
//                         "value":"cotton"
//                       }
//                     ]
//                   }
//                 ]
//               },
//               {
//                 "id":"I4",
//                 "parent_item_id":"V1",
//                 "descriptor":
//                 {
//                   "name":"Allen Solly Men T-shirt",
//                   "code":"4:XXXXXXXX",
//                   "symbol":"https://sellerNP.com/images/i4.png",
//                   "short_desc":"Allen Solly Men T-shirt",
//                   "long_desc":"Allen Solly Men T-shirt",
//                   "images":
//                   [
//                     "https://sellerNP.com/images/i4.png"
//                   ]
//                 },
//                 "quantity":
//                 {
//                   "unitized":
//                   {
//                     "measure":
//                     {
//                       "unit":"unit",
//                       "value":"1"
//                     }
//                   },
//                   "available":
//                   {
//                     "count":"99"
//                   },
//                   "maximum":
//                   {
//                     "count":"99"
//                   }
//                 },
//                 "price":
//                 {
//                   "currency":"INR",
//                   "value":"948.0",
//                   "maximum_value":"999.0"
//                 },
//                 "category_id":"T Shirts",
//                 "fulfillment_id":"F1",
//                 "location_id":"L1",
//                 "@ondc/org/returnable":true,
//                 "@ondc/org/cancellable":true,
//                 "@ondc/org/return_window":"P7D",
//                 "@ondc/org/seller_pickup_return":true,
//                 "@ondc/org/time_to_ship":"P1D",
//                 "@ondc/org/available_on_cod":false,
//                 "@ondc/org/contact_details_consumer_care": "Ramesh,ramesh@abc.com,18004254444",
//                 "@ondc/org/statutory_reqs_packaged_commodities":
//                 {
//                   "manufacturer_or_packer_name":"Aditya Birla Fashion & Retail Ltd",
//                   "manufacturer_or_packer_address":"Building 2, Divyasree Technopolis, Off HAL Airport Road, Bengaluru-560037",
//                   "common_or_generic_name_of_commodity":"Polo",
//                   "month_year_of_manufacture_packing_import":"01/2017"
//                 },
//                 "tags":
//                 [
//                   {
//                     "code":"origin",
//                     "list":
//                     [
//                       {
//                         "code":"country",
//                         "value":"IND"
//                       }
//                     ]
//                   },
//                   {
//                     "code":"attribute",
//                     "list":
//                     [
//                       {
//                         "code":"gender",
//                         "value":"male"
//                       },
//                       {
//                         "code":"colour",
//                         "value":"#008000"
//                       },
//                       {
//                         "code":"colour_name",
//                         "value":"Green"
//                       },
//                       {
//                         "code":"size",
//                         "value":"2XL"
//                       },
//                       {
//                         "code":"brand",
//                         "value":"Allen Solly"
//                       },
//                       {
//                         "code":"size_chart",
//                         "value":"https://sellerNP.com/images/i4_size_chart.png"
//                       },
//                       {
//                         "code":"fabric",
//                         "value":"cotton"
//                       }
//                     ]
//                   }
//                 ]
//               },
//               {
//                 "id":"I5",
//                 "parent_item_id":"V1",
//                 "descriptor":
//                 {
//                   "name":"Allen Solly Men T-shirt",
//                   "code":"4:XXXXXXXX",
//                   "symbol":"https://sellerNP.com/images/i5.png",
//                   "short_desc":"Allen Solly Men T-shirt",
//                   "long_desc":"Allen Solly Men T-shirt",
//                   "images":
//                   [
//                     "https://sellerNP.com/images/i5.png"
//                   ]
//                 },
//                 "quantity":
//                 {
//                   "unitized":
//                   {
//                     "measure":
//                     {
//                       "unit":"unit",
//                       "value":"1"
//                     }
//                   },
//                   "available":
//                   {
//                     "count":"99"
//                   },
//                   "maximum":
//                   {
//                     "count":"99"
//                   }
//                 },
//                 "price":
//                 {
//                   "currency":"INR",
//                   "value":"589.0",
//                   "maximum_value":"999.0"
//                 },
//                 "category_id":"T Shirts",
//                 "fulfillment_id":"F1",
//                 "location_id":"L1",
//                 "@ondc/org/returnable":true,
//                 "@ondc/org/cancellable":true,
//                 "@ondc/org/return_window":"P7D",
//                 "@ondc/org/seller_pickup_return":true,
//                 "@ondc/org/time_to_ship":"P1D",
//                 "@ondc/org/available_on_cod":false,
//                 "@ondc/org/contact_details_consumer_care": "Ramesh,ramesh@abc.com,18004254444",
//                 "@ondc/org/statutory_reqs_packaged_commodities":
//                 {
//                   "manufacturer_or_packer_name":"Aditya Birla Fashion & Retail Ltd",
//                   "manufacturer_or_packer_address":"Building 2, Divyasree Technopolis, Off HAL Airport Road, Bengaluru-560037",
//                   "common_or_generic_name_of_commodity":"Polo",
//                   "month_year_of_manufacture_packing_import":"01/2017"
//                 },
//                 "tags":
//                 [
//                   {
//                     "code":"origin",
//                     "list":
//                     [
//                       {
//                         "code":"country",
//                         "value":"IND"
//                       }
//                     ]
//                   },
//                   {
//                     "code":"attribute",
//                     "list":
//                     [
//                       {
//                         "code":"gender",
//                         "value":"male"
//                       },
//                       {
//                         "code":"colour",
//                         "value":"#FFFF00"
//                       },
//                       {
//                         "code":"colour_name",
//                         "value":"Yellow"
//                       },
//                       {
//                         "code":"size",
//                         "value":"L"
//                       },
//                       {
//                         "code":"brand",
//                         "value":"Allen Solly"
//                       },
//                       {
//                         "code":"size_chart",
//                         "value":"https://sellerNP.com/images/i5_size_chart.png"
//                       },
//                       {
//                         "code":"fabric",
//                         "value":"cotton"
//                       }
//                     ]
//                   }
//                 ]
//               },
//               {
//                 "id":"I6",
//                 "parent_item_id":"V1",
//                 "descriptor":
//                 {
//                   "name":"Allen Solly Men T-shirt",
//                   "code":"4:XXXXXXXX",
//                   "symbol":"https://sellerNP.com/images/i6.png",
//                   "short_desc":"Allen Solly Men T-shirt",
//                   "long_desc":"Allen Solly Men T-shirt",
//                   "images":
//                   [
//                     "https://sellerNP.com/images/i6.png"
//                   ]
//                 },
//                 "quantity":
//                 {
//                   "unitized":
//                   {
//                     "measure":
//                     {
//                       "unit":"unit",
//                       "value":"1"
//                     }
//                   },
//                   "available":
//                   {
//                     "count":"99"
//                   },
//                   "maximum":
//                   {
//                     "count":"99"
//                   }
//                 },
//                 "price":
//                 {
//                   "currency":"INR",
//                   "value":"789.0",
//                   "maximum_value":"999.0"
//                 },
//                 "category_id":"T Shirts",
//                 "fulfillment_id":"F1",
//                 "location_id":"L1",
//                 "@ondc/org/returnable":true,
//                 "@ondc/org/cancellable":true,
//                 "@ondc/org/return_window":"P7D",
//                 "@ondc/org/seller_pickup_return":true,
//                 "@ondc/org/time_to_ship":"P1D",
//                 "@ondc/org/available_on_cod":false,
//                 "@ondc/org/contact_details_consumer_care": "Ramesh,ramesh@abc.com,18004254444",
//                 "@ondc/org/statutory_reqs_packaged_commodities":
//                 {
//                   "manufacturer_or_packer_name":"Aditya Birla Fashion & Retail Ltd",
//                   "manufacturer_or_packer_address":"Building 2, Divyasree Technopolis, Off HAL Airport Road, Bengaluru-560037",
//                   "common_or_generic_name_of_commodity":"Polo",
//                   "month_year_of_manufacture_packing_import":"01/2017"
//                 },
//                 "tags":
//                 [
//                   {
//                     "code":"origin",
//                     "list":
//                     [
//                       {
//                         "code":"country",
//                         "value":"IND"
//                       }
//                     ]
//                   },
//                   {
//                     "code":"attribute",
//                     "list":
//                     [
//                       {
//                         "code":"gender",
//                         "value":"male"
//                       },
//                       {
//                         "code":"colour",
//                         "value":"#FFFF00"
//                       },
//                       {
//                         "code":"colour_name",
//                         "value":"Yellow"
//                       },
//                       {
//                         "code":"size",
//                         "value":"XL"
//                       },
//                       {
//                         "code":"brand",
//                         "value":"Allen Solly"
//                       },
//                       {
//                         "code":"size_chart",
//                         "value":"https://sellerNP.com/images/i6_size_chart.png"
//                       },
//                       {
//                         "code":"fabric",
//                         "value":"cotton"
//                       }
//                     ]
//                   }
//                 ]
//               },
//               {
//                 "id":"I7",
//                 "parent_item_id":"V1",
//                 "descriptor":
//                 {
//                   "name":"Allen Solly Men T-shirt",
//                   "code":"4:XXXXXXXX",
//                   "symbol":"https://sellerNP.com/images/i7.png",
//                   "short_desc":"Allen Solly Men T-shirt",
//                   "long_desc":"Allen Solly Men T-shirt",
//                   "images":
//                   [
//                     "https://sellerNP.com/images/i7.png"
//                   ]
//                 },
//                 "quantity":
//                 {
//                   "unitized":
//                   {
//                     "measure":
//                     {
//                       "unit":"unit",
//                       "value":"1"
//                     }
//                   },
//                   "available":
//                   {
//                     "count":"99"
//                   },
//                   "maximum":
//                   {
//                     "count":"99"
//                   }
//                 },
//                 "price":
//                 {
//                   "currency":"INR",
//                   "value":"689.0",
//                   "maximum_value":"999.0"
//                 },
//                 "category_id":"T Shirts",
//                 "fulfillment_id":"F1",
//                 "location_id":"L1",
//                 "@ondc/org/returnable":true,
//                 "@ondc/org/cancellable":true,
//                 "@ondc/org/return_window":"P7D",
//                 "@ondc/org/seller_pickup_return":true,
//                 "@ondc/org/time_to_ship":"P1D",
//                 "@ondc/org/available_on_cod":false,
//                 "@ondc/org/contact_details_consumer_care": "Ramesh,ramesh@abc.com,18004254444",
//                 "@ondc/org/statutory_reqs_packaged_commodities":
//                 {
//                   "manufacturer_or_packer_name":"Aditya Birla Fashion & Retail Ltd",
//                   "manufacturer_or_packer_address":"Building 2, Divyasree Technopolis, Off HAL Airport Road, Bengaluru-560037",
//                   "common_or_generic_name_of_commodity":"Polo",
//                   "month_year_of_manufacture_packing_import":"01/2017"
//                 },
//                 "tags":
//                 [
//                   {
//                     "code":"origin",
//                     "list":
//                     [
//                       {
//                         "code":"country",
//                         "value":"IND"
//                       }
//                     ]
//                   },
//                   {
//                     "code":"attribute",
//                     "list":
//                     [
//                       {
//                         "code":"gender",
//                         "value":"male"
//                       },
//                       {
//                         "code":"colour",
//                         "value":"#FFFF00"
//                       },
//                       {
//                         "code":"colour_name",
//                         "value":"Yellow"
//                       },
//                       {
//                         "code":"size",
//                         "value":"2XL"
//                       },
//                       {
//                         "code":"brand",
//                         "value":"Allen Solly"
//                       },
//                       {
//                         "code":"size_chart",
//                         "value":"https://sellerNP.com/images/i7_size_chart.png"
//                       },
//                       {
//                         "code":"fabric",
//                         "value":"cotton"
//                       }
//                     ]
//                   }
//                 ]
//               }
//             ],
//             "creds":
//             [
//               {
//                 "id":"ESG-12345678",
//                 "descriptor":
//                 {
//                   "code":"ESG-12345678",
//                   "short_desc":"ESG-12345678-FF",
//                   "name":"Dun & Bradstreet ESG Badge No."
//                 },
//                 "url":"https://abcd.cdn.com/images/badge-img",
//                 "tags":
//                 [
//                   {
//                     "code":"verification",
//                     "list":
//                     [
//                       {
//                         "code":"verify_url",
//                         "value":"https://abcd.dnb.com/verify?id=''ESG-12345678'"'
//                       },
//                       {
//                         "code":"valid_from",
//                         "value":"2023-06-03T00:00:00:000Z"
//                       },
//                       {
//                         "code":"valid_to",
//                         "value":"2024-06-03T23:59:59:999Z"
//                       }
//                     ]
//                   }
//                 ]
//               }
//             ],
//             "tags":
//             [
//               {
//                 "code":"order_value",
//                 "list":
//                 [
//                   {
//                     "code":"min_value",
//                     "value":"300.00"
//                   }
//                 ]
//               },
//               {
//                 "code":"timing",
//                 "list":
//                 [
//                   {
//                     "code":"type",
//                     "value":"All"
//                   },
//                   {
//                     "code":"location",
//                     "value":"L1"
//                   },
//                   {
//                     "code":"day_from",
//                     "value":"1"
//                   },
//                   {
//                     "code":"day_to",
//                     "value":"7"
//                   },
//                   {
//                     "code":"time_from",
//                     "value":"0000"
//                   },
//                   {
//                     "code":"time_to",
//                     "value":"2359"
//                   }
//                 ]
//               },
//               {
//                 "code":"serviceability",
//                 "list":
//                 [
//                   {
//                     "code":"location",
//                     "value":"L1"
//                   },
//                   {
//                     "code":"category",
//                     "value":"Men's Topwear"
//                   },
//                   {
//                     "code":"type",
//                     "value":"12"
//                   },
//                   {
//                     "code":"val",
//                     "value":"IND"
//                   },
//                   {
//                     "code":"unit",
//                     "value":"country"
//                   }
//                 ]
//               }
//             ]
//           }
//         ]
//       }
//     }
// }


const data = [
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.0.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.1.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.2.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.3.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.4.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.5.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.6.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.7.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001',
    'path': 'message.catalog.bpp/providers.0.items.8.tags.1.list.1.value',
    'message': "Colour value should start with '#'"
  },
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.9.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.10.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.11.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.12.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.13.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.14.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.15.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001',
    'path': 'message.catalog.bpp/providers.0.items.16.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.17.tags.1.list.1.value',
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.18.tags.1.list.1.value',
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.19.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.20.tags.1.list.1.value',
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.21.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.22.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  }, 
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.23.tags.1.list.1.value', 
    'message': "Colour value should start with '#'"
  },
  {
    'type': 'ITEM-ERROR', 
    'code': '91001', 
    'path': 'message.catalog.bpp/providers.0.items.24.tags.1.list.1.value',
   'message': "Colour value should start with '#'"
  }
]
  