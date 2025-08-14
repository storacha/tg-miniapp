
/**
 * Behavior:
 * - Review (changes_requested) on a non-draft PR: add awaiting-author, remove awaiting-review
 * - Review (approved): remove awaiting-author
 * - PR events (synchronize, reopened, ready_for_review) when not draft: remove awaiting-author, add awaiting-review
 * - Converted to draft OR currently draft: remove awaiting-author & awaiting-review (pause timers)
 */

/** 
 * @param {Object} params
 * @param {import('github-script').Context} params.context
 * @param {import('@octokit/rest').Octokit} params.github
 * @param {import('@actions/core')} params.core
 */
module.exports = async ({github, context, core})=> {
    core.info(`Event: ${context.eventName} action: ${context.payload.action || 'n/a'}`)

    const pr = context.payload.pull_request || context.payload.review?.pull_request
    if (!pr) return

    const isFork = pr.head.repo.full_name !== pr.base.repo.full_name;
    if (isFork) core.info('Fork PR detected!');

    const { owner, repo } = context.repo
    const issue_number = pr.number

    const currentLabels = (pr.labels || []).map(l => (typeof l === 'string' ? l : l.name))
    const hasAwaitingAuthor = currentLabels.includes('awaiting-author')

    const handleError = (e, label, op) => { 
        if (e.status === 422) { 
            if (op === 'add') { 
                core.warning(`Cannot add "${label}", it likely does not exist or the payload is invalid.`) 
            } else { 
                core.info(`Validation failed while removing "${label}". Skipping.`) 
            } 
        } else if (e.status === 403) {
            core.warning(`Permission denied editing label ${label} ${isFork ? '(fork PR)' : ''}: ${e.message}`)
        } else if (e.status === 404) {
            if (op === 'add') {
                core.info(`Resource not found while adding "${label}".`)
            }
            // if it's remove then we can ignore because the label already doesn't exist
        } else {
            throw e
        }
    }

    async function add(label) {
        try {
            await github.rest.issues.addLabels({ owner, repo, issue_number, labels: [label] })
            core.info(`Added label: ${label}`)
        } catch (e) {
           handleError(e, label, 'add')
        }
    }

    async function remove(label) {
        try {
            await github.rest.issues.removeLabel({ owner, repo, issue_number, name: label })
            core.info(`Removed label: ${label}`)
        } catch (e) {
            handleError(e, label, 'remove')
        }
    }

    if (context.eventName === 'pull_request_review') {
        if (pr.draft) {
            core.info('PR is draft, ignoring review event.')
            return
        }

        const state = (context.payload.review.state || '').toLowerCase()
        core.info(`Review state: ${state}`)

        if (state === 'changes_requested') {
            await add('awaiting-author')
            await remove('awaiting-review')
        } else if (state === 'approved') {
            await remove('awaiting-author')
            await remove('awaiting-review')
        }
    }

    if (context.eventName === 'pull_request' || context.eventName === 'pull_request_target') {
        const action = context.payload.action
        core.info(`PR action: ${action}`)

        if (action === 'converted_to_draft') {
            core.info('Clearing labels because PR was converted to draft.')
            await remove('awaiting-author')
            await remove('awaiting-review')
            return
        }

         if (action === 'review_requested') {
            core.info('Update label to awaiting-review because review was requested.')
            await remove('awaiting-author')
            await add('awaiting-review')
            return
         }
       
        if (['reopened', 'ready_for_review'].includes(action)) {
            core.info('PR updated (commit/reopen/ready), switching to awaiting-review.')
            await remove('awaiting-author')
            await add('awaiting-review')
        }

        if (action === 'synchronize') {
            if (hasAwaitingAuthor) {
                core.info('Commit pushed while awaiting-author, keeping awaiting-author label.')
                return
            }
            core.info('Commit pushed, adding awaiting-review label.')
            await add('awaiting-review')
        }
    }
}
