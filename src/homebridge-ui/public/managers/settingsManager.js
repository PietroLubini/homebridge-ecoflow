import { SettingsManagerBase } from './settingsManagerBase.js';

export class SettingsManager extends SettingsManagerBase {
  render(configuration, configSchema) {
    this.renderGeneralSettings({ configuration, configSchema, propertiesNames: ['name'] });
    this.renderDevicesSettings({
      configuration,
      configSchema,
      propertiesNames: ['name', 'model', 'serialNumber', 'location', 'accessKey', 'secretKey', 'simulate'],
    });
  }

  renderGeneralSettings(context) {
    this.renderProperties(
      $('#generalSettings'),
      context,
      context.configSchema.schema.properties,
      context.configuration
    );
  }

  renderDevicesSettings(context, activeDeviceIndex) {
    $('#devicesLabel').text(context.configSchema.schema.properties['devices'].title);
    const activeIndex = !activeDeviceIndex || activeDeviceIndex < 0 ? 0 : activeDeviceIndex;
    this.renderDeviceTabs(context, activeIndex);
    this.renderDeviceTabPanels(context, activeIndex);

    const myForm = homebridge.createForm(context.configSchema, context.configuration);
    myForm.onChange(change => {
      console.log('[a] form change: ', change);
    });
  }

  renderDeviceTabs(context, activeIndex) {
    const tabTemplate = `
    <li class="nav-item">
      <a class="nav-link {activeClass}" data-toggle="tab" href="#deviceTabPanel{index}" id="deviceTab{index}">{name}</a>
    </li>
  `;
    const $tabs = $('#devicesTabs');
    $tabs.empty();
    context.configuration.devices.forEach((device, index) => {
      const activeTabClass = index === activeIndex ? 'active' : '';

      const tabHtml = tabTemplate
        .replace(/{activeClass}/g, activeTabClass)
        .replace(/{index}/g, index.toString())
        .replace(/{name}/g, device.name ?? `Device${index + 1}`);

      $tabs.append(tabHtml);
    });
    this.renderAddDeviceTab($tabs, tabTemplate, context);
  }

  renderAddDeviceTab($parent, template, context) {
    const html = template
      .replace(/{activeClass}/g, '')
      .replace(/{index}/g, 'Add')
      .replace(/{name}/g, 'Add Device');
    $parent.append(html);
    const $addButton = $('#deviceTabAdd', $parent);
    $addButton.click(async () => {
      const defaultDeviceConfiguration = {};
      const properties = context.configSchema.schema.properties.devices.items.properties;
      Object.keys(properties)
        .filter(propertyName => !!properties[propertyName].default)
        .forEach(propertyName => {
          defaultDeviceConfiguration[propertyName] = properties[propertyName].default;
        });
      context.configuration.devices.push(defaultDeviceConfiguration);
      await this.updatePluginConfig(context.configuration);
      this.renderDevicesSettings(context, context.configuration.devices.length - 1);
    });
  }

  renderDeviceTabPanels(context, activeIndex) {
    const tabPanelTemplate = `
    <div class="tab-pane container fade {activeClass} card card-body list-group-item" id="deviceTabPanel{index}">
      <button type="button" class="close pull-right" id="deviceTabPanelClose{index}">
        <span>×</span>
        <span class="sr-only">Close</span>
      </button>
    </div>
  `;
    const $tabPanels = $('#devicesPanels');
    $tabPanels.empty();
    context.configuration.devices.forEach((deviceConfiguration, index) => {
      const activeTabPanelClass = index === activeIndex ? 'in show active' : '';
      const tabPanelHtml = tabPanelTemplate
        .replace(/{activeClass}/g, activeTabPanelClass)
        .replace(/{index}/g, index.toString());

      $tabPanels.append(tabPanelHtml);

      const $tabPanel = $(`#deviceTabPanel${index}`, $tabPanels);
      this.renderProperties(
        $tabPanel,
        context,
        context.configSchema.schema.properties.devices.items.properties,
        deviceConfiguration,
        index
      );
      const $removeButton = $(`#deviceTabPanelClose${index}`, $tabPanels);
      this.addRemoveDeviceHandler($removeButton, index, context);
    });
  }

  addRemoveDeviceHandler($removeButton, index, context) {
    $removeButton.click(async () => {
      context.configuration.devices.splice(index, 1);
      await this.updatePluginConfig(context.configuration);
      this.renderDevicesSettings(context, index - 1);
    });
  }

  async updateChanges(context, index, propertyNamePath) {
    await this.updatePluginConfig(context.configuration);
    if (index !== undefined && propertyNamePath in ['name', 'model']) {
      this.renderDevicesSettings(context, index);
    }
  }
}
