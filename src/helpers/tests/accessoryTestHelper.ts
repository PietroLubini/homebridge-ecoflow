import { EcoFlowAccessory } from '@ecoflow/accessories/ecoFlowAccessory';

export interface MockService {
  Name: string;
}

export function getActualServices(accessory: EcoFlowAccessory): MockService[] {
  return accessory.services.map(service => {
    return {
      Name: service.constructor.name,
    };
  });
}
