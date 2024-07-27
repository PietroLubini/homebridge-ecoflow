import fs from 'fs';
import { Service } from 'homebridge';
import path from 'path';
import { fileURLToPath } from 'url';
import { ServiceBase } from './serviceBase.js';

export class AccessoryInformationService extends ServiceBase {
  protected override createService(): Service {
    const service =
      this.ecoFlowAccessory.accessory.getService(this.platform.Service.AccessoryInformation) ||
      this.ecoFlowAccessory.accessory.addService(this.platform.Service.AccessoryInformation);

    service
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'EcoFlow')
      .setCharacteristic(this.platform.Characteristic.Model, this.ecoFlowAccessory.config.model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.ecoFlowAccessory.config.serialNumber)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.getVersion());
    return service;
  }

  private getVersion(): string {
    const filename = fileURLToPath(import.meta.url);
    const dirname = path.dirname(filename);
    const packageJsonPath = path.resolve(dirname, '../../package.json');
    const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageData?.version;
  }
}
