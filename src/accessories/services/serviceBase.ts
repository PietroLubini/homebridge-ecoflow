import { Logging, Service } from 'homebridge';
import { EcoFlowAccessory } from 'accessories/ecoFlowAccessory.js';

export abstract class ServiceBase {
  protected readonly log: Logging;
  private _service: Service | null = null;

  constructor(protected ecoFlowAccessory: EcoFlowAccessory) {
    this.log = ecoFlowAccessory.log;
  }

  public initialize(): void {
    this._service = this.createService();
  }

  // Getter for service
  public get service(): Service {
    return this._service!;
  }

  protected abstract createService(): Service;
}
