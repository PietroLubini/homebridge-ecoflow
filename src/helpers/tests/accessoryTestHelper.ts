import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';

export interface MockService {
  Name: string;
}

export function getActualServices(accessory: EcoFlowAccessoryBase): MockService[] {
  return accessory.services.map(service => {
    return {
      Name: service.constructor.name,
    };
  });
}
