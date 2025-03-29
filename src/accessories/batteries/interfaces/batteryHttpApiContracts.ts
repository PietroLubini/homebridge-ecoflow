export enum AcEnableType {
  Off = 0,
  On = 1,
  Ignore = 0xff,
}

export enum AcXBoostType {
  Off = 0,
  On = 1,
  Ignore = 0xff,
}

export enum AcOutFrequencyType {
  '50 Hz' = 1,
  '60 Hz' = 2,
  Ignore = 0xff,
}

export const AcOutVoltageIgnore = 0xffffffff;
