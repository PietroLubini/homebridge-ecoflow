import { API } from 'homebridge';

import { EcoFlowHomebridgePlatform } from './platform';
import { PLATFORM_NAME } from './settings';

/**
 * This method registers the platform with Homebridge
 */
export default (api: API) => {
  api.registerPlatform(PLATFORM_NAME, EcoFlowHomebridgePlatform);
};
