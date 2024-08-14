require('module-alias/register');

import { EcoFlowHomebridgePlatform } from '@ecoflow/platform';
import { PLATFORM_NAME } from '@ecoflow/settings';
import { API } from 'homebridge';

/**
 * This method registers the platform with Homebridge
 */
export default (api: API): void => {
  api.registerPlatform(PLATFORM_NAME, EcoFlowHomebridgePlatform);
};
