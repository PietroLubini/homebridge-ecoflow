import { Service } from 'homebridge';
import { ServiceBase } from './serviceBase.js';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

export class AccessoryInformationService extends ServiceBase {
  protected override createService(): Service {
    const service =
      this.ecoFlowAccessory.accessory.getService(this.ecoFlowAccessory.platform.Service.AccessoryInformation) ||
      this.ecoFlowAccessory.accessory.addService(this.ecoFlowAccessory.platform.Service.AccessoryInformation);

    service
      .setCharacteristic(this.ecoFlowAccessory.platform.Characteristic.Manufacturer, 'EcoFlow')
      .setCharacteristic(this.ecoFlowAccessory.platform.Characteristic.Model, this.ecoFlowAccessory.config.model)
      .setCharacteristic(
        this.ecoFlowAccessory.platform.Characteristic.SerialNumber,
        this.ecoFlowAccessory.config.serialNumber
      )
      .setCharacteristic(this.ecoFlowAccessory.platform.Characteristic.FirmwareRevision, this.getVersion());
    return service;
  }

  private getVersion(): string {
    const filename = fileURLToPath(import.meta.url);
    const dirname = path.dirname(filename);
    const packageJsonPath = path.resolve(dirname, '../../../package.json');
    const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageData?.version;
  }
}
