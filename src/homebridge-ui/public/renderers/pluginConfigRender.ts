import { IContext, IDeviceContext } from '../interfaces/contracts';
import {
  IForm,
  IHomebridge,
  PluginConfig,
  PluginConfigSchema,
  PluginConfigSchemaDevicesItems,
  PluginConfigSchemaEnum,
  PluginDeviceConfig,
} from '../interfaces/homebridge';
import { CommonRenderer } from './commonRenderer';

export class PluginConfigRenderer {
  private form: IForm | undefined;

  constructor(private readonly commonRenderer: CommonRenderer) {}

  public render(
    homebridgeProvider: IHomebridge,
    configuration: PluginConfig,
    configSchema: PluginConfigSchema,
    hideDeviceSettingsPerModel: Record<string, string[]>
  ): void {
    this.renderGeneralSettings({ homebridgeProvider, configuration, configSchema });
    this.renderDevicesSettings({ homebridgeProvider, configSchema, configuration, hideDeviceSettingsPerModel });
  }

  private renderGeneralSettings(context: IContext): void {
    this.commonRenderer.renderTextBox(
      $('#generalSettings'),
      'name',
      context.configSchema.schema.properties.name,
      context.configuration.name,
      async newValue => {
        context.configuration.name = newValue;
        await this.updatePluginConfig(context);
      }
    );
  }

  private renderDevicesSettings(context: IDeviceContext, activeDeviceIndex?: number): void {
    $('#devicesLabel').text(context.configSchema.schema.properties['devices'].title);
    const activeIndex = !activeDeviceIndex || activeDeviceIndex < 0 ? 0 : activeDeviceIndex;
    this.renderDeviceTabs(context, activeIndex);
  }

  private renderDeviceTabs(context: IDeviceContext, activeIndex: number): void {
    const { $tabs, $tabPanels } = this.clearDeviceTabs();

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

      $tabs.append(tabHtml);

      this.renderDeviceTabPanel(
        context,
        deviceConfiguration,
        index,
        activeIndex,
        $(`#deviceTab${index}`, $tabs),
        $tabPanels
      );
    });

    this.renderAddNewDeviceTab($tabs, tabTemplate, context);
  }

  private clearDeviceTabs(): { $tabs: JQuery; $tabPanels: JQuery } {
    const $tabs = $('#devicesTabs');
    const $tabPanels = $('#devicesPanels');
    $tabs.empty();
    $tabPanels.empty();
    this.form?.end();
    return { $tabs, $tabPanels };
  }

  private renderAddNewDeviceTab($parent: JQuery, template: string, context: IDeviceContext): void {
    const html = template
      .replace(/{activeClass}/g, '')
      .replace(/{index}/g, 'Add')
      .replace(/{name}/g, 'Add Device');
    $parent.append(html);
    const $addButton = $('#deviceTabAdd', $parent);
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
    $tab: JQuery,
    $tabPanels: JQuery
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

    $tabPanels.append(tabPanelHtml);
    const $tabPanel = $(`#deviceTabPanel${index}`, $tabPanels);

    const deviceSchema = this.clone(context.configSchema.schema.properties.devices.items);
    const modelSchema = deviceSchema.properties.model;
    this.renderModelDropDown($tabPanel, index, context, modelSchema!, deviceConfiguration);
    this.renderRemoveButton($tabPanel, index, context);
    this.renderForm($tab, index, activeIndex, context, deviceSchema, deviceConfiguration);
  }

  private renderModelDropDown(
    $parent: JQuery,
    index: number,
    context: IDeviceContext,
    modelSchema: PluginConfigSchemaEnum,
    deviceConfiguration: PluginDeviceConfig
  ) {
    this.commonRenderer.renderDropDown($parent, 'model' + index, modelSchema, deviceConfiguration.model, newValue => {
      deviceConfiguration.model = newValue;
      this.renderDevicesSettings(context, index);
    });
  }

  private renderRemoveButton($parent: JQuery, index: number, context: IDeviceContext) {
    const $removeButton = $(`#deviceTabPanelClose${index}`, $parent);
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
    delete deviceSchema.properties.model;
    context.hideDeviceSettingsPerModel[deviceConfiguration.model].forEach(propertyName => {
      delete deviceSchema.properties[propertyName];
    });

    $tab.on('click', () => {
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

  private async updatePluginConfig(context: IContext): Promise<void> {
    const changes = this.clone(context.configuration);
    delete changes.platform;
    await context.homebridgeProvider.updatePluginConfig([changes]);
  }

  private clone<TObject>(obj: TObject): TObject {
    return JSON.parse(JSON.stringify(obj));
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
