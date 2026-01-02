import { CharacteristicPermsType } from '@ecoflow/characteristics/characteristicContracts';
import type { API } from 'homebridge';

declare module 'homebridge' {
  interface Characteristic {
    setPropsPerms(permsType: CharacteristicPermsType): this;
  }
}

export const InitCharacteristicExtensions = (api: API) => {
  const { Perms, Characteristic } = api.hap;

  Characteristic.prototype.setPropsPerms = function (permsType: CharacteristicPermsType) {
    switch (permsType) {
      case CharacteristicPermsType.READ_ONLY:
        this.setProps({ perms: [Perms.PAIRED_READ, Perms.NOTIFY] });
        break;

      default:
        this.setProps({
          perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.NOTIFY],
        });
        break;
    }
    return this;
  };
};
