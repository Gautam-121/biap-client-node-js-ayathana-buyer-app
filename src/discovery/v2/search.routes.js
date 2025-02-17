import {Router} from 'express';
import { authentication } from '../../middlewares/index.js';
import searchValidator from "./search.validator..js"
import SearchController from './search.controller.js';

const router = new Router();
const searchController = new SearchController();

// search
router.get( // done
    '/v2/search', searchValidator.search , searchController.search,
);

// search
router.get(
    '/v2/search/global/items',  searchController.globalSearchItems,
);

// get item details
router.get(
    '/v2/items/:id',searchController.getItem,
);

// get item details
router.get(
    '/v2/providers/:itemId', searchController.getProvider,
);

// get item details
router.get(
    '/v2/provider-details', searchValidator.providerDetails , searchController.getProvideDetails,
);
// get item details
router.get(
    '/v2/location-details', searchController.getLocationDetails,
);

// get item details
router.get(
    '/v2/item-details/:id', searchController.getItemDetails,
);

// get item details
router.get(
    '/v2/locations/:id',   searchController.getLocation,
);


router.get(
    '/v2/attributes',  searchValidator.attributes ,  searchController.getAttributes,
);

router.get(
    '/v2/items',  searchController.getItems,
);

router.get(
    '/v2/locations',   searchController.getLocations,
);

router.get(
    '/v2/nearlocations',  searchController.getLocationsNearest,
);

router.get(
    '/v2/servieablelocations',   searchController.servieablelocations,
);

// get item attributes values
router.get(
    '/v2/attributeValues',  searchValidator.attributesValues,  searchController.getAttributesValues,
);

// get providers
router.get(
    '/v2/providers',  searchValidator.provider , searchController.getProviders,
);

// get providers
router.get(
    '/v2/search/global/providers',   searchController.getGlobalProviders,
);

// get custom menus
router.get(
    '/v2/custom-menus',   searchController.getCustomMenu,
);

// get offers
router.get(
    '/v2/offers',   searchController.getOffers,
);


// get offers
router.get(
    '/v2/categories',  searchController.getUniqueCategories,
);


// // get custom menus
// router.get(
//     '/v2/custom-menus/:id', authentication(), searchController.getProviderCustomMenus,
// );
//
// // get item details
// router.get(
//     '/v2/locations/:id', authentication(), searchController.getProviderLocations,
// );
//
// // get item details
// router.get(
//     '/v2/locations', authentication(), searchController.getLocations,
// );
//
// // get providers
// router.get(
//     '/v2/providers/:id', authentication(), searchController.getProviderDetails,
// );

export default router;
