import { Characteristic } from 'hap-nodejs';
import { Formats, Perms } from 'homebridge';

export enum EveUnits {
  WATT = 'W',
  VOLT = 'V',
  AMPERE = 'A',
  KILOWATT_HOUR = 'kWh',
}

export class PowerConsumptionVolt extends Characteristic {
  public static readonly UUID: string = 'E863F10A-079E-48FF-8F27-9C2605A29F52';

  constructor() {
    super('Volt', PowerConsumptionWatt.UUID, {
      format: Formats.FLOAT,
      perms: [Perms.NOTIFY, Perms.PAIRED_READ],
      unit: EveUnits.VOLT,
    });
    this.value = this.getDefaultValue();
  }
}

export class PowerConsumptionAmpere extends Characteristic {
  public static readonly UUID: string = 'E863F126-079E-48FF-8F27-9C2605A29F52';

  constructor() {
    super('Ampere', PowerConsumptionWatt.UUID, {
      format: Formats.FLOAT,
      perms: [Perms.NOTIFY, Perms.PAIRED_READ],
      unit: EveUnits.AMPERE,
    });
    this.value = this.getDefaultValue();
  }
}

export class PowerConsumptionWatt extends Characteristic {
  public static readonly UUID: string = 'E863F10D-079E-48FF-8F27-9C2605A29F52';

  constructor() {
    super('Consumption', PowerConsumptionWatt.UUID, {
      format: Formats.FLOAT,
      perms: [Perms.NOTIFY, Perms.PAIRED_READ],
      unit: EveUnits.WATT,
    });
    this.value = this.getDefaultValue();
  }
}

export class PowerConsumptionKilowattHour extends Characteristic {
  public static readonly UUID: string = 'E863F10C-079E-48FF-8F27-9C2605A29F52';

  constructor() {
    super('Total Consumption', PowerConsumptionWatt.UUID, {
      format: Formats.FLOAT,
      perms: [Perms.NOTIFY, Perms.PAIRED_READ],
      unit: EveUnits.KILOWATT_HOUR,
    });
    this.value = this.getDefaultValue();
  }
}

export class PowerConsumption {
  public static readonly Watt: typeof PowerConsumptionWatt = PowerConsumptionWatt;
  public static readonly Volt: typeof PowerConsumptionVolt = PowerConsumptionVolt;
  public static readonly Ampere: typeof PowerConsumptionAmpere = PowerConsumptionAmpere;
}

// https://gist.github.com/simont77/3f4d4330fa55b83f8ca96388d9004e7d
export class EveCharacteristic {
  public static readonly PowerConsumption: typeof PowerConsumption = PowerConsumption;
}
