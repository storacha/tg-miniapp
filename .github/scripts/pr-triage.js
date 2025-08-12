
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
    const pr = context.payload.pull_request || context.payload.review?.pull_request
    if (!pr) return

    const { owner, repo } = context.repo
    const issue_number = pr.number

    const currentLabels = (pr.labels || []).map(l => (typeof l === 'string' ? l : l.name))
    const hasAwaitingAuthor = currentLabels.includes('awaiting-author')

    async function add(label) {
        try {
            await github.rest.issues.addLabels({ owner, repo, issue_number, labels: [label] })
            core.info(`Added label: ${label}`)
        } catch (e) {
            if (e.status !== 422) throw e // already has label
        }
    }

    async function remove(label) {
        try {
            await github.rest.issues.removeLabel({ owner, repo, issue_number, name: label })
            core.info(`Removed label: ${label}`)
        } catch (e) {
            if (e.status !== 404) throw e // label not present
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
        }
    }

    if (context.eventName === 'pull_request') {
        const action = context.payload.action
        core.info(`PR action: ${action}`)

        if (action === 'converted_to_draft' || pr.draft) {
            core.info('Clearing labels because PR is draft or was converted to draft.')
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
