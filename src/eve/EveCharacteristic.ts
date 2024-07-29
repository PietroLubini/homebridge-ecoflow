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
    super('Voltage', PowerConsumptionVolt.UUID, {
      description: '"Voltage, V" in Eve App',
      format: Formats.FLOAT,
      perms: [Perms.NOTIFY, Perms.PAIRED_READ],
      unit: EveUnits.VOLTAGE,
      minValue: 0,
      minStep: 1,
      maxValue: 300,
    });
    this.value = this.getDefaultValue();
  }
}

export class PowerConsumptionAmpere extends Characteristic {
  public static readonly UUID: string = 'E863F126-079E-48FF-8F27-9C2605A29F52';
  constructor() {
    super('Current', PowerConsumptionAmpere.UUID, {
      description: '"Current, A" in Eve App',
      format: Formats.FLOAT,
      perms: [Perms.NOTIFY, Perms.PAIRED_READ],
      unit: EveUnits.CURRENT,
      minValue: 0,
      minStep: 0.1,
      maxValue: 100,
    });
    this.value = this.getDefaultValue();
  }
}

export class PowerConsumptionWatt extends Characteristic {
  public static readonly UUID: string = 'E863F10D-079E-48FF-8F27-9C2605A29F52';
  constructor() {
    super('Consumption', PowerConsumptionWatt.UUID, {
      description: '"Consumption, W" in Eve App',
      format: Formats.FLOAT,
      perms: [Perms.NOTIFY, Perms.PAIRED_READ],
      unit: EveUnits.WATT,
      minValue: -100000,
      minStep: 0.1,
      maxValue: 100000,
    });
    this.value = this.getDefaultValue();
  }
}

export class PowerConsumptionKilowattHour extends Characteristic {
  public static readonly UUID: string = 'E863F10C-079E-48FF-8F27-9C2605A29F52';
  constructor() {
    super('Total Consumption', PowerConsumptionKilowattHour.UUID, {
      description: '"Total Consumption, kW/h" in Eve App',
      format: Formats.FLOAT,
      perms: [Perms.NOTIFY, Perms.PAIRED_READ],
      unit: EveUnits.KILOWATT_HOUR,
      minValue: 0,
      minStep: 0.1,
      maxValue: 50,
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
