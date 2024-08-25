import { EcoFlowAccessoryBase } from '@ecoflow/accessories/ecoFlowAccessoryBase';
import { ServiceBase } from '@ecoflow/services/serviceBase';
import { readFileSync } from 'fs';
import { Characteristic } from 'homebridge';
import { join } from 'path';

const packageJsonPath = join(__dirname, '../../package.json');

export class AccessoryInformationService extends ServiceBase {
  constructor(protected readonly ecoFlowAccessory: EcoFlowAccessoryBase) {
    super(ecoFlowAccessory.platform.Service.AccessoryInformation, ecoFlowAccessory);
  }

  protected override addCharacteristics(): Characteristic[] {
    const characteristics = [
      this.addCharacteristic(this.platform.Characteristic.Manufacturer),
      this.addCharacteristic(this.platform.Characteristic.Model),
      this.addCharacteristic(this.platform.Characteristic.SerialNumber),
      this.addCharacteristic(this.platform.Characteristic.FirmwareRevision),
      this.addCharacteristic(this.platform.Characteristic.Identify),
    ];

    this.service
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'EcoFlow')
      .setCharacteristic(this.platform.Characteristic.Model, this.ecoFlowAccessory.config.model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.ecoFlowAccessory.config.serialNumber)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.getVersion());
    return characteristics;
  }

  private getVersion(): string {
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return packageJson?.version;
  }
}
