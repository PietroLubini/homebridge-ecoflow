import { Characteristic as HapCharacteristic, Perms } from 'hap-nodejs';

declare module 'hap-nodejs' {
  interface Characteristic {
    setPropsPerms(permsType: CharacteristicPermsType): this;
  }
}

export enum CharacteristicPermsType {
  DEFAULT = 0,
  READ_ONLY = 1,
}

HapCharacteristic.prototype.setPropsPerms = function (permsType: CharacteristicPermsType): HapCharacteristic {
  switch (permsType) {
    case CharacteristicPermsType.READ_ONLY:
      this.setProps({ perms: [Perms.PAIRED_READ, Perms.NOTIFY] });
      break;
    case CharacteristicPermsType.DEFAULT:
    default:
      this.setProps({ perms: [Perms.PAIRED_READ, Perms.PAIRED_WRITE, Perms.NOTIFY] });
      break;
  }
  return this;
};
