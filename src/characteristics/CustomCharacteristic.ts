import { Characteristic } from 'hap-nodejs';
import { Formats, Perms, Units } from 'homebridge';

export class BatteryLevel extends Characteristic {
  public static readonly UUID: string = 'B6A95625-7EDF-49E0-B3BD-4BDF89CD1FE7';
  constructor() {
    super('Battery Level', BatteryLevel.UUID, {
      description: '"Battery Level, %" for usage in conditions of Automations',
      format: Formats.FLOAT,
      perms: [Perms.NOTIFY],
      minValue: 0,
      maxValue: 100,
      minStep: 1,
      unit: Units.PERCENTAGE,
    });
    this.value = this.getDefaultValue();
  }
}

export class InputConsumptionWatt extends Characteristic {
  public static readonly UUID: string = '13172B0A-D346-4730-9732-32EF5B6EF8B7';
  constructor() {
    super('Input Consumption', InputConsumptionWatt.UUID, {
      description: '"Input Consumption, W" for usage in conditions of Automations',
      format: Formats.FLOAT,
      perms: [Perms.NOTIFY],
      minValue: 0,
      maxValue: 100,
      minStep: 1,
      unit: Units.CELSIUS,
    });
    this.value = this.getDefaultValue();
  }
}

export class Battery {
  public static readonly BatteryLevel: typeof BatteryLevel = BatteryLevel;
}

export class PowerConsumption {
  public static readonly InputConsumptionWatts: typeof InputConsumptionWatt = InputConsumptionWatt;
}

export class CustomCharacteristic {
  public static readonly Battery: typeof Battery = Battery;
  public static readonly PowerConsumption: typeof PowerConsumption = PowerConsumption;
}
