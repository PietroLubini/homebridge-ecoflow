import { Characteristic } from 'hap-nodejs';
import { Formats, Perms } from 'homebridge';

export enum EveUnits {
  WATT = 'W',
  VOLTAGE = 'V',
  CURRENT = 'A',
  KILOWATT_HOUR = 'kWh',
}

export class PowerConsumptionVolt extends Characteristic {
  public static readonly UUID: string = 'E863F10A-079E-48FF-8F27-9C2605A29F52';
  constructor() {
    super('Eve-Volt', PowerConsumptionVolt.UUID, {
      format: Formats.FLOAT,
      minValue: 0,
      minStep: 1,
      maxValue: 300,
      perms: [Perms.NOTIFY, Perms.PAIRED_READ],
      unit: EveUnits.VOLTAGE,
      description: 'Voltage (V) value. Used by Eve App',
    });
    this.value = this.getDefaultValue();
  }
}

export class PowerConsumptionAmpere extends Characteristic {
  public static readonly UUID: string = 'E863F126-079E-48FF-8F27-9C2605A29F52';
  constructor() {
    super('Eve-Ampere', PowerConsumptionAmpere.UUID, {
      format: Formats.FLOAT,
      minValue: 0,
      minStep: 0.1,
      maxValue: 100,
      perms: [Perms.NOTIFY, Perms.PAIRED_READ],
      unit: EveUnits.CURRENT,
      description: 'Current (A) value. Used by Eve App',
    });
    this.value = this.getDefaultValue();
  }
}

export class PowerConsumptionWatt extends Characteristic {
  public static readonly UUID: string = 'E863F10D-079E-48FF-8F27-9C2605A29F52';
  constructor() {
    super('Eve-Watt', PowerConsumptionWatt.UUID, {
      format: Formats.FLOAT,
      minValue: 0,
      minStep: 1,
      maxValue: 100000,
      perms: [Perms.NOTIFY, Perms.PAIRED_READ],
      unit: EveUnits.WATT,
      description: 'Watt (W) value. Used by Eve App, reported as "Consumption"',
    });
    this.value = this.getDefaultValue();
  }
}

export class PowerConsumptionKilowattHour extends Characteristic {
  public static readonly UUID: string = 'E863F10C-079E-48FF-8F27-9C2605A29F52';
  constructor() {
    super('Eve-Kilowatt-Hour', PowerConsumptionKilowattHour.UUID, {
      format: Formats.FLOAT,
      minValue: 0,
      minStep: 0.1,
      maxValue: 100,
      perms: [Perms.NOTIFY, Perms.PAIRED_READ],
      unit: EveUnits.KILOWATT_HOUR,
      description: 'Kilowatt-hour (kWh) value. Used by Eve App, reported as "Total Consumption"',
    });
    this.value = this.getDefaultValue();
  }
}

export class PowerConsumption {
  public static readonly ConsumptionWatts: typeof PowerConsumptionWatt = PowerConsumptionWatt;
  public static readonly ConsumptionKiloWatts: typeof PowerConsumptionKilowattHour = PowerConsumptionKilowattHour;
  public static readonly Voltage: typeof PowerConsumptionVolt = PowerConsumptionVolt;
  public static readonly Current: typeof PowerConsumptionAmpere = PowerConsumptionAmpere;
}

// https://gist.github.com/simont77/3f4d4330fa55b83f8ca96388d9004e7d
export class EveCharacteristic {
  public static readonly PowerConsumption: typeof PowerConsumption = PowerConsumption;
}
