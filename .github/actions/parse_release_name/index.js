const core = require('@actions/core');
const releaseNameKey = 'release-name';
const releaseVersionKey = 'release-version';
const releaseTagKey = 'release-tag';

try {
  const releaseName = core.getInput(releaseNameKey);
  core.info(`ReleaseName: ${releaseName}`);

  const paths = releaseName.split('/');
  const cleanReleaseName = paths[paths.length - 1];

  const releaseVersion = cleanReleaseName.startsWith('v') ? cleanReleaseName.substring(1) : cleanReleaseName;
  const releaseTag = releaseVersion.includes('-beta') ? 'beta' : releaseVersion.includes('-alpha') ? 'alpha' : null;
  core.info(`${releaseVersionKey}: ${releaseVersion}`);
  core.setOutput(releaseVersionKey, releaseVersion);
  if (releaseTag) {
    core.info(`${releaseTagKey}: ${releaseTag}`);
    core.setOutput(releaseTagKey, releaseTag);
  }
} catch (error) {
  core.setFailed(error.message);
}
