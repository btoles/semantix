const Git = require('./providers/git.provider');
const GitHub = require('./services/github.service');
const GitLab = require('./services/gitlab.service');
const Parser = require('./utils/parser');
const Generate = require('./utils/generate');
const Version = require('./providers/version.provider');
const verifyGitProvider = require('./verify.git.provider');
const { GITHUB_TOKEN, GITLAB_TOKEN } = require('./utils/constants');

module.exports = async (releaseBranch, releaseMapping) => {
    const commits = await Git.commits();
    const next = await Version.next(releaseMapping);
    const current = await Version.current();
    // Drop commits that don't match our keyword mapping before generating notes
    const keywordFilter = commit => releaseMapping[commit.keyword] !== undefined;
    const parsed = (await Parser.commits(commits, current.sha)).filter(keywordFilter);
    const releaseNotes = await Generate.releaseNotes(releaseMapping, parsed);

    if (await verifyGitProvider()) {
        if (GITHUB_TOKEN) {
            const git = new GitHub();
            await git.createTag(`v${next}`, await Git.headSha(), releaseNotes);
            await git.createRelease(releaseBranch, `v${next}`, releaseNotes);
            console.log(`🌠 Successfully created release v${next}!`);
        }
        if (GITLAB_TOKEN) {
            const git = new GitLab();
            await git.createTag(`v${next}`, await Git.headSha(), releaseNotes);
            console.log(`🌠 Successfully created release v${next}!`);
        }
    }
};