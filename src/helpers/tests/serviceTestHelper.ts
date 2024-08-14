import { CharacteristicValue, Nullable, Service } from 'homebridge';

export interface MockCharacteristic {
  UUID: string;
  value: Nullable<CharacteristicValue>;
}

export function getActualCharacteristics(service: Service): MockCharacteristic[] {
  return service.characteristics.map(characteristic => {
    return {
      UUID: characteristic.UUID,
      value: characteristic.value,
    };
  });
}
