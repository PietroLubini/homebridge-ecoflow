const core = require('@actions/core');
const releaseNameKey = 'release-name';
const releaseVersionKey = 'release-version';

try {
  const releaseName = core.getInput(releaseNameKey);
  core.info(`ReleaseName: ${releaseName}`);

  const paths = releaseName.split('/');
  const cleanReleaseName = paths[paths.length - 1];

  const releaseVersion = cleanReleaseName.startsWith('v') ? cleanReleaseName.substring(1) : cleanReleaseName;
  core.info(`${releaseVersionKey}: ${releaseVersion}`);

  core.setOutput(releaseVersionKey, releaseVersion);
} catch (error) {
  core.setFailed(error.message);
}
