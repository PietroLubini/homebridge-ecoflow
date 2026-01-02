import { Characteristic as HapCharacteristic, Perms } from 'hap-nodejs';
import { API } from 'homebridge';
import { CharacteristicPermsType } from './characteristicContracts';
import { InitCharacteristicExtensions } from './characteristicExtensions';

describe('characteristicExtensions', () => {
  describe('setPropsPerms', () => {
    let characteristic: HapCharacteristic;

    beforeEach(() => {
      characteristic = Object.create(HapCharacteristic.prototype);
      characteristic.setProps = jest.fn().mockReturnThis();
      const apiMock = {
        hap: {
          Characteristic: HapCharacteristic,
        },
      } as unknown as API;
      InitCharacteristicExtensions(apiMock);
    });

    it('should set default perms when called with DEFAULT', () => {
      characteristic.setPropsPerms(CharacteristicPermsType.DEFAULT);

      expect(characteristic.setProps).toHaveBeenCalledWith({
        perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.NOTIFY],
      });
    });

    it('should set read-only perms when called with READ_ONLY', () => {
      characteristic.setPropsPerms(CharacteristicPermsType.READ_ONLY);

      expect(characteristic.setProps).toHaveBeenCalledWith({
        perms: [Perms.PAIRED_READ, Perms.NOTIFY],
      });
    });

    it('should set default perms when called with undefined', () => {
      characteristic.setPropsPerms(undefined as unknown as CharacteristicPermsType);

      expect(characteristic.setProps).toHaveBeenCalledWith({
        perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.NOTIFY],
      });
    });

    it('should return the characteristic instance for chaining', () => {
      const actual = characteristic.setPropsPerms(CharacteristicPermsType.DEFAULT);

      expect(actual).toBe(characteristic);
    });
  });
});
