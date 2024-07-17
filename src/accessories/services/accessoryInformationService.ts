import { Service } from 'homebridge';
import { ServiceBase } from './serviceBase.js';
import { Subscription } from 'rxjs';
import { fileURLToPath } from 'url';
import path from 'path';
import fs from 'fs';

export class AccessoryInformationService extends ServiceBase {
  protected override createService(): Service {
    const service =
      this.accessory.getService(this.platform.Service.AccessoryInformation) ||
      this.accessory.addService(this.platform.Service.AccessoryInformation);

    service
      .setCharacteristic(this.platform.Characteristic.Manufacturer, 'EcoFlow')
      .setCharacteristic(this.platform.Characteristic.Model, this.config.model)
      .setCharacteristic(this.platform.Characteristic.SerialNumber, this.config.serialNumber)
      .setCharacteristic(this.platform.Characteristic.FirmwareRevision, this.getVersion());
    return service;
  }

  protected subscribe(): Subscription[] {
    return [];
  }

  private getVersion(): string {
    const filename = fileURLToPath(import.meta.url);
    const dirname = path.dirname(filename);
    const packageJsonPath = path.resolve(dirname, '../../../package.json');
    const packageData = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageData?.version;
  }
}
