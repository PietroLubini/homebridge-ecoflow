import { SettingsManagerBase } from './settingsManagerBase.js';

export class SettingsManager extends SettingsManagerBase {
  render(configuration, configSchema, hideDeviceSettingsPerModel) {
    this.renderGeneralSettings(configuration, configSchema);
    this.renderDevicesSettings({ configuration, configSchema, hideDeviceSettingsPerModel });
  }

  renderGeneralSettings(configuration, configSchema) {
    this.renderTextBox(
      $('#generalSettings'),
      'name',
      configSchema.schema.properties['name'],
      this.getName(configuration),
      async newValue => {
        this.setName(configuration, newValue);
        await this.updatePluginConfig(configuration);
      }
    );
  }

  renderDevicesSettings(context, activeDeviceIndex) {
    $('#devicesLabel').text(context.configSchema.schema.properties['devices'].title);
    const activeIndex = !activeDeviceIndex || activeDeviceIndex < 0 ? 0 : activeDeviceIndex;
    this.renderDeviceTabs(context, activeIndex);
  }

  renderDeviceTabs(context, activeIndex) {
    const { $tabs, $tabPanels } = this.clearDeviceTabs();

    const tabTemplate = `
      <li class="nav-item">
        <a class="nav-link {activeClass}" data-toggle="tab" href="#deviceTabPanel{index}" id="deviceTab{index}">{name}</a>
      </li>
    `;

    context.configuration.devices.forEach((deviceConfiguration, index) => {
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

  clearDeviceTabs() {
    const $tabs = $('#devicesTabs');
    const $tabPanels = $('#devicesPanels');
    $tabs.empty();
    $tabPanels.empty();
    return { $tabs, $tabPanels };
  }

  renderAddNewDeviceTab($parent, template, context) {
    const html = template
      .replace(/{activeClass}/g, '')
      .replace(/{index}/g, 'Add')
      .replace(/{name}/g, 'Add Device');
    $parent.append(html);
    const $addButton = $('#deviceTabAdd', $parent);
    $addButton.click(() => {
      context.configuration.devices.push(this.getDefaultDeviceConfiguration(context.configSchema));
      this.renderDevicesSettings(context, context.configuration.devices.length - 1);
    });
  }

  renderDeviceTabPanel(context, deviceConfiguration, index, activeIndex, $tab, $tabPanels) {
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
    this.renderModelDropDown($tabPanel, index, context, modelSchema, deviceConfiguration);
    this.renderRemoveButton($tabPanel, index, context);
    this.renderForm($tab, index, activeIndex, context, deviceSchema, deviceConfiguration);
  }

  renderModelDropDown($parent, index, context, modelSchema, deviceConfiguration) {
    this.renderDropDown($parent, 'model' + index, modelSchema, this.getDeviceModel(deviceConfiguration), newValue => {
      this.setDeviceModel(deviceConfiguration, newValue);
      this.renderDevicesSettings(context, index);
    });
  }

  renderRemoveButton($parent, index, context) {
    const $removeButton = $(`#deviceTabPanelClose${index}`, $parent);
    $removeButton.click(() => {
      context.configuration.devices.splice(index, 1);
      this.renderDevicesSettings(context, index - 1);
    });
  }

  renderForm($tab, index, activeIndex, context, deviceSchema, deviceConfiguration) {
    delete deviceSchema.properties.model;
    const model = this.getDeviceModel(deviceConfiguration);
    context.hideDeviceSettingsPerModel[model].forEach(propertyName => {
      delete deviceSchema.properties[propertyName];
    });

    $tab.click(() => {
      const form = homebridge.createForm({ schema: deviceSchema }, deviceConfiguration);
      form.onChange(async newDeviceConfiguration => {
        const oldName = this.getDeviceName(context.configuration.devices[index]);
        this.applyChanges(context.configuration.devices[index], newDeviceConfiguration, ['model']);
        await this.updatePluginConfig(context.configuration);

        if (this.getDeviceName(newDeviceConfiguration) !== oldName) {
          $tab.text(this.getDeviceName(newDeviceConfiguration));
        }
      });
    });
    if (index === activeIndex) {
      $tab.click();
    }
  }

  getDefaultDeviceConfiguration(configSchema) {
    const result = {};
    const properties = configSchema.schema.properties.devices.items.properties;
    Object.keys(properties)
      .filter(propertyName => !!properties[propertyName].default)
      .forEach(propertyName => {
        result[propertyName] = properties[propertyName].default;
      });
    return result;
  }

  getName(configuration) {
    return configuration['name'];
  }

  setName(configuration, value) {
    configuration['name'] = value;
  }

  getDeviceName(deviceConfiguration) {
    return deviceConfiguration['name'];
  }

  getDeviceModel(deviceConfiguration) {
    return deviceConfiguration['model'];
  }

  setDeviceModel(deviceConfiguration, value) {
    deviceConfiguration['model'] = value;
  }
}
