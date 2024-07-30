import { Characteristic } from 'hap-nodejs';
import { Formats, Perms, Units } from 'homebridge';

export class BatteryLevel extends Characteristic {
  public static readonly UUID: string = 'B6A95625-7EDF-49E0-B3BD-4BDF89CD1FE7';
  constructor() {
    super('Battery Level', BatteryLevel.UUID, {
      description: 'Battery Level, %',
      format: Formats.FLOAT,
      perms: [Perms.NOTIFY, Perms.PAIRED_READ],
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
      description: 'Input Consumption, W',
      format: Formats.FLOAT,
      perms: [Perms.NOTIFY, Perms.PAIRED_READ],
      minValue: 0,
      maxValue: 50000,
      minStep: 1,
      unit: Units.CELSIUS, // To allow setting numeric value for conditions in ShortCuts
    });
    this.value = this.getDefaultValue();
  }
}

export class OutputConsumptionWatt extends Characteristic {
  // Eve characteristic
  public static readonly UUID: string = 'E863F10D-079E-48FF-8F27-9C2605A29F52';
  constructor() {
    super('Output Consumption', OutputConsumptionWatt.UUID, {
      description: 'Output Consumption, W',
      format: Formats.FLOAT,
      perms: [Perms.NOTIFY, Perms.PAIRED_READ],
      unit: Units.CELSIUS, // To allow setting numeric value for conditions in ShortCuts
      minValue: 0,
      maxValue: 50000,
    });
    this.value = this.getDefaultValue();
  }
}

// https://gist.github.com/simont77/3f4d4330fa55b83f8ca96388d9004e7d
// export class PowerConsumptionVolt extends Characteristic {
//   public static readonly UUID: string = 'E863F10A-079E-48FF-8F27-9C2605A29F52';
//   constructor() {
//     super('Voltage', PowerConsumptionVolt.UUID, {
//       description: '"Voltage, V" in Eve App',
//       format: Formats.FLOAT,
//       perms: [Perms.NOTIFY, Perms.PAIRED_READ],
//       minValue: 0,
//       maxValue: 300,
//     });
//     this.value = this.getDefaultValue();
//   }
// }

// export class PowerConsumptionAmpere extends Characteristic {
//   public static readonly UUID: string = 'E863F126-079E-48FF-8F27-9C2605A29F52';
//   constructor() {
//     super('Current', PowerConsumptionAmpere.UUID, {
//       description: '"Current, A" in Eve App',
//       format: Formats.FLOAT,
//       perms: [Perms.NOTIFY, Perms.PAIRED_READ],
//       minValue: 0,
//       maxValue: 100,
//     });
//     this.value = this.getDefaultValue();
//   }
// }

// export class PowerConsumptionKilowattHour extends Characteristic {
//   public static readonly UUID: string = 'E863F10C-079E-48FF-8F27-9C2605A29F52';
//   constructor() {
//     super('Total Consumption', PowerConsumptionKilowattHour.UUID, {
//       description: '"Total Consumption, kW/h" in Eve App',
//       format: Formats.FLOAT,
//       perms: [Perms.NOTIFY, Perms.PAIRED_READ],
//       minValue: 0,
//       maxValue: 50,
//     });
//     this.value = this.getDefaultValue();
//   }
// }

export class Battery {
  public static readonly BatteryLevel: typeof BatteryLevel = BatteryLevel;
}

export class PowerConsumption {
  public static readonly InputConsumptionWatts: typeof InputConsumptionWatt = InputConsumptionWatt;
  public static readonly OutputConsumptionWatts: typeof OutputConsumptionWatt = OutputConsumptionWatt;
}

export class CustomCharacteristic {
  public static readonly Battery: typeof Battery = Battery;
  public static readonly PowerConsumption: typeof PowerConsumption = PowerConsumption;
}
