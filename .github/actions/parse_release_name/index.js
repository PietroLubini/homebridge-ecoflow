const core = require('@actions/core');
const { release } = require('os');
const releaseNameKey = 'release-name';
const releaseVersionKey = 'release-version';

try {
  const releaseName = core.getInput(releaseNameKey);
  core.info(`ReleaseName ${releaseName}!`);

  const releaseVersion = version.startsWith('v') ? version.substring(1) : releaseName;
  core.info(`${releaseVersionKey}: ${releaseVersion}`);

  core.setOutput(releaseVersionKey, releaseVersion);
} catch (error) {
  core.setFailed(error.message);
}
