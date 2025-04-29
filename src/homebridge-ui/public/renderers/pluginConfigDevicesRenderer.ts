import { IContext, IDeviceContext } from '../interfaces/contracts';
import {
  IForm,
  PluginConfigSchema,
  PluginConfigSchemaDevicesItems,
  PluginConfigSchemaEnum,
  PluginDeviceConfig,
} from '../interfaces/homebridge';
import { ComponentRenderer } from './componentRenderer';
import { PluginConfigRendererBase } from './pluginConfigRendererBase';

export class PluginConfigDevicesRenderer extends PluginConfigRendererBase {
  private form: IForm | undefined;
  private readonly $tabs: JQuery;
  private readonly $tabPanels: JQuery;
  private readonly _hideDeviceSettingsPerModel: Record<string, string[]>;

  constructor(componentRenderer: ComponentRenderer) {
    super(componentRenderer);
    this.$tabs = $('#devicesTabs');
    this.$tabPanels = $('#devicesPanels');
    this._hideDeviceSettingsPerModel = {
      'Delta 2': ['powerStream', 'powerOcean', 'outlet'],
      'Delta 2 Max': ['powerStream', 'powerOcean', 'outlet'],
      'Delta Pro': ['powerStream', 'powerOcean', 'outlet'],
      'Delta Pro 3': ['powerStream', 'powerOcean', 'outlet'],
      'Delta Pro Ultra': ['powerStream', 'powerOcean', 'outlet'],
      PowerStream: ['battery', 'powerOcean', 'outlet'],
      PowerOcean: ['battery', 'powerStream', 'outlet'],
      'Smart Plug': ['battery', 'powerStream', 'powerOcean'],
      Glacier: ['powerStream', 'powerOcean', 'outlet'],
    };
  }

  public get hideDeviceSettingsPerModel(): Record<string, string[]> {
    return this._hideDeviceSettingsPerModel;
  }

  public render(context: IContext): void {
    this.renderDevicesSettings({
      homebridgeProvider: context.homebridgeProvider,
      configSchema: context.configSchema,
      configuration: context.configuration,
      hideDeviceSettingsPerModel: this.hideDeviceSettingsPerModel,
    });
  }

  private renderDevicesSettings(context: IDeviceContext, activeDeviceIndex?: number): void {
    $('#devicesLabel').text(context.configSchema.schema.properties['devices'].title);
    const activeIndex = !activeDeviceIndex || activeDeviceIndex < 0 ? 0 : activeDeviceIndex;
    this.renderDeviceTabs(context, activeIndex);
  }

  private renderDeviceTabs(context: IDeviceContext, activeIndex: number): void {
    this.clearDeviceTabs();

    const tabTemplate = `
      <li class="nav-item">
        <a class="nav-link {activeClass}" data-toggle="tab" href="#deviceTabPanel{index}" id="deviceTab{index}">{name}</a>
      </li>
    `;

    context.configuration.devices.forEach((deviceConfiguration: PluginDeviceConfig, index: number) => {
      const activeTabClass = index === activeIndex ? 'active' : '';

      const tabHtml = tabTemplate
        .replace(/{activeClass}/g, activeTabClass)
        .replace(/{index}/g, index.toString())
        .replace(/{name}/g, deviceConfiguration.name ?? `Device${index + 1}`);

      this.$tabs.append(tabHtml);

      this.renderDeviceTabPanel(
        context,
        deviceConfiguration,
        index,
        activeIndex,
        this.$tabs.find(`#deviceTab${index}`)
      );
    });

    this.renderAddNewDeviceTab(tabTemplate, context);
  }

  private clearDeviceTabs(): void {
    this.$tabs.empty();
    this.$tabPanels.empty();
    this.form?.end();
  }

  private renderAddNewDeviceTab(template: string, context: IDeviceContext): void {
    const html = template
      .replace(/{activeClass}/g, '')
      .replace(/{index}/g, 'Add')
      .replace(/{name}/g, 'Add Device');
    this.$tabs.append(html);
    const $addButton = this.$tabs.find('#deviceTabAdd');
    $addButton.on('click', () => {
      context.configuration.devices.push(this.getDefaultDeviceConfiguration(context.configSchema));
      this.renderDevicesSettings(context, context.configuration.devices.length - 1);
    });
  }

  private renderDeviceTabPanel(
    context: IDeviceContext,
    deviceConfiguration: PluginDeviceConfig,
    index: number,
    activeIndex: number,
    $tab: JQuery
  ): void {
    const tabPanelTemplate = `
    <div class="tab-pane container fade {activeClass} card card-body list-group-item" id="deviceTabPanel{index}">
      <button type="button" class="close pull-right" id="deviceTabPanelClose{index}">
        <span>×</span>
        <span class="sr-only">Close</span>
      </button>
    </div>
  `;

    const activeTabPanelClass = index === activeIndex ? 'in show active' : '';
    const tabPanelHtml = tabPanelTemplate
      .replace(/{activeClass}/g, activeTabPanelClass)
      .replace(/{index}/g, index.toString());

    this.$tabPanels.append(tabPanelHtml);
    const $tabPanel = this.$tabPanels.find(`#deviceTabPanel${index}`);

    const deviceSchema = this.clone(context.configSchema.schema.properties.devices.items);
    const modelSchema = deviceSchema.properties.model;
    this.renderModelDropDown($tab, $tabPanel, index, context, deviceSchema, modelSchema!, deviceConfiguration);
    this.renderRemoveButton($tabPanel, index, context);
    this.renderForm($tab, index, activeIndex, context, deviceSchema, deviceConfiguration);
  }

  private renderModelDropDown(
    $tab: JQuery,
    $tabPanel: JQuery,
    index: number,
    context: IDeviceContext,
    deviceSchema: PluginConfigSchemaDevicesItems,
    modelSchema: PluginConfigSchemaEnum,
    deviceConfiguration: PluginDeviceConfig
  ) {
    this.componentRenderer.renderDropDown(
      $tabPanel,
      'model' + index,
      modelSchema,
      deviceConfiguration.model,
      newValue => {
        deviceConfiguration.model = newValue;
        this.renderForm($tab, index, index, context, deviceSchema, deviceConfiguration);
      }
    );
  }

  private renderRemoveButton($parent: JQuery, index: number, context: IDeviceContext) {
    const $removeButton = $parent.find(`#deviceTabPanelClose${index}`);
    $removeButton.on('click', () => {
      context.configuration.devices.splice(index, 1);
      this.renderDevicesSettings(context, index - 1);
    });
  }

  private renderForm(
    $tab: JQuery,
    index: number,
    activeIndex: number,
    context: IDeviceContext,
    deviceSchema: PluginConfigSchemaDevicesItems,
    deviceConfiguration: PluginDeviceConfig
  ): void {
    deviceSchema = this.clone(deviceSchema);
    delete deviceSchema.properties.model;
    context.hideDeviceSettingsPerModel[deviceConfiguration.model].forEach(propertyName => {
      delete deviceSchema.properties[propertyName];
    });

    $tab.off('click').on('click', () => {
      this.form?.end();
      this.form = context.homebridgeProvider.createForm({ schema: deviceSchema }, deviceConfiguration);
      this.form.onChange(async newDeviceConfiguration => {
        const oldName = context.configuration.devices[index].name;
        this.applyChanges(context.configuration.devices[index], newDeviceConfiguration, ['model']);
        await this.updatePluginConfig(context);

        if (newDeviceConfiguration.name !== oldName) {
          $tab.text(newDeviceConfiguration.name);
        }
      });
    });
    if (index === activeIndex) {
      $tab.trigger('click');
    }
  }

  private getDefaultDeviceConfiguration(configSchema: PluginConfigSchema): PluginDeviceConfig {
    const result = {} as PluginDeviceConfig;
    const properties = configSchema.schema.properties.devices.items.properties;
    Object.keys(properties)
      .filter(propertyName => !!properties[propertyName]?.default)
      .forEach(propertyName => {
        result[propertyName] = properties[propertyName]?.default;
      });
    return result;
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private applyChanges(target: any, source: any, readOnlyProperties: string[]): void {
    Object.assign(target, source);
    for (const key in target) {
      if (source[key] === undefined && !readOnlyProperties.includes(key)) {
        delete target[key];
      }
    }
  }
}
