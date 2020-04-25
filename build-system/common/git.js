/**
 * Copyright 2018 The AMP HTML Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
'use strict';

/**
 * @fileoverview Provides functions for executing various git commands.
 */

const {
  isTravisBuild,
  isTravisPullRequestBuild,
  travisPullRequestBranch,
  travisPullRequestSha,
} = require('./travis');
const {getStdout} = require('./exec');

/**
 * Returns the remote tracking branch associated with the local master branch.
 * @return {string}
 */
function gitUpstreamMaster() {
  const upstreamName = getStdout('git config branch.master.remote').trim();
  return (upstreamName || 'origin') + '/master';
}

/**
 * Shortens a commit SHA to 7 characters for human readability.
 * @param {string} sha 40 characters SHA.
 * @return {string} 7 characters SHA.
 */
function shortSha(sha) {
  return sha.substr(0, 7);
}

/**
 * Returns the list of files changed but not committed to the local branch, one
 * on each line.
 * @return {!Array<string>}
 */
function gitDiffNameOnly() {
  return getStdout('git diff --name-only').trim().split('\n');
}

/**
 * Returns the list of files changed relative to the branch point off of master,
 * one on each line.
 * @return {!Array<string>}
 */
function gitDiffNameOnlyMaster() {
  const masterBaseline = gitMasterBaseline();
  return getStdout(`git diff --name-only ${masterBaseline}`).trim().split('\n');
}

/**
 * Returns the list of files changed relative to the branch point off of master,
 * in diffstat format.
 * @return {string}
 */
function gitDiffStatMaster() {
  const masterBaseline = gitMasterBaseline();
  return getStdout(`git -c color.ui=always diff --stat ${masterBaseline}`);
}

/**
 * Returns a detailed log of commits included in a PR check, starting with (and
 * including) the branch point off of master. Limited to commits in the past
 * 30 days to keep the output sane.
 *
 * @return {string}
 */
function gitDiffCommitLog() {
  const branchCreationPoint = gitMasterBaseline();
  const commitLog = getStdout(`git -c color.ui=always log --graph \
--pretty=format:"%C(red)%h%C(reset) %C(bold cyan)%an%C(reset) \
-%C(yellow)%d%C(reset) %C(reset)%s%C(reset) %C(green)(%cr)%C(reset)" \
--abbrev-commit ${branchCreationPoint}^...HEAD --since "30 days ago"`).trim();
  return commitLog;
}

/**
 * Returns the list of files added by the local branch relative to the branch
 * point off of master, one on each line.
 * @return {!Array<string>}
 */
function gitDiffAddedNameOnlyMaster() {
  const branchPoint = gitMasterBaseline();
  return getStdout(`git diff --name-only --diff-filter=ARC ${branchPoint}`)
    .trim()
    .split('\n');
}

/**
 * Returns the full color diff of the uncommited changes on the local branch.
 * @return {string}
 */
function gitDiffColor() {
  return getStdout('git -c color.ui=always diff').trim();
}

/**
 * Returns the full color diff of the given file relative to the branch point off of master.
 * @param {string} file
 * @return {string}
 */
function gitDiffFileMaster(file) {
  const masterBaseline = gitMasterBaseline();
  return getStdout(`git -c color.ui=always diff -U1 ${masterBaseline} ${file}`);
}

/**
 * Returns the name of the branch from which the PR originated.
 * @return {string}
 */
function gitBranchName() {
  return isTravisPullRequestBuild()
    ? travisPullRequestBranch()
    : getStdout('git rev-parse --abbrev-ref HEAD').trim();
}

/**
 * Returns the commit hash of the latest commit.
 * @return {string}
 */
function gitCommitHash() {
  if (isTravisPullRequestBuild()) {
    return travisPullRequestSha();
  }
  return getStdout('git rev-parse --verify HEAD').trim();
}

/**
 * Returns the email of the author of the latest commit on the local branch.
 * @return {string}
 */
function gitCommitterEmail() {
  return getStdout('git log -1 --pretty=format:"%ae"').trim();
}

/**
 * Returns list of commit SHAs and their cherry-pick status from master.
 *
 * `git cherry <branch>` returns a list of commit SHAs. While the exact
 * mechanism is too complicated for this comment (run `git help cherry` for a
 * full explanation), the gist of it is that commits that were cherry-picked
 * from <branch> are prefixed with '- ', and those that were not are prefixed
 * with '+ '.
 *
 * @return {!Array<{sha: string, isCherryPick: boolean}>}
 */
function gitCherryMaster() {
  return getStdout(`git cherry ${gitUpstreamMaster()}`)
    .trim()
    .split('\n')
    .map((line) => ({
      isCherryPick: line.substring(0, 2) == '- ',
      sha: line.substring(2),
    }));
}

/**
 * Returns (UTC) time of a commit on the local branch, in %y%m%d%H%M%S format.
 *
 * @param {string} ref a Git reference (commit SHA, branch name, etc.) for the
 *   commit to get the time of.
 * @return {string}
 */
function gitCommitFormattedTime(ref = 'HEAD') {
  return getStdout(
    `TZ=UTC git log ${ref} -1 --pretty="%cd" --date=format-local:%y%m%d%H%M%S`
  ).trim();
}

/**
 * Returns the master baseline commit, or in other words, the commit at which
 * the current branch was forked off of upstream master.
 * @return {string}
 */
function gitMasterBaseline() {
  return getStdout(`git merge-base ${gitUpstreamMaster()} HEAD`).trim();
}

/**
 * Returns the diffs for given path based on the given commit
 * @param {string} path
 * @param {string} commit
 * @return {string}
 */
function gitDiffPath(path, commit) {
  return getStdout(`git diff ${commit} ${path}`).trim();
}

module.exports = {
  gitBranchName,
  gitCherryMaster,
  gitCommitFormattedTime,
  gitCommitHash,
  gitCommitterEmail,
  gitDiffAddedNameOnlyMaster,
  gitDiffColor,
  gitDiffCommitLog,
  gitDiffFileMaster,
  gitDiffNameOnly,
  gitDiffNameOnlyMaster,
  gitDiffPath,
  gitDiffStatMaster,
  gitMasterBaseline,
  gitUpstreamMaster,
  shortSha,
};
