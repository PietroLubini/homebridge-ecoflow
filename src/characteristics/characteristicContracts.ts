export enum EnableType {
  Off = 0,
  On = 1,
}

// Service: HeaterCooler
export enum CurrenttHeaterCoolerStateType {
  Inactive = 0,
  Idle = 1,
  Heating = 2,
  Cooling = 3,
}

// Service: HeaterCooler
export enum TargetHeaterCoolerStateType {
  Auto = 0,
  Heat = 1,
  Cool = 2,
}

// Service: Thermostat
export enum CurrentHeatingCoolingStateType {
  Off = 0,
  Heat = 1,
  Cool = 2,
}

// Service: Thermostat
export enum TargetHeatingCoolingStateType {
  Off = 0,
  Heat = 1,
  Cool = 2,
  Auto = 3,
}

// Service: HeaterCooler, Thermostat
export enum TemperatureDisplayUnitsType {
  Celsius = 0,
  Fahrenheit = 1,
}

// Service: HeaterCooler, Thermostat
export enum FridgeStateType {
  Off = 0,
  On = 1,
}
