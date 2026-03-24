// This is a background job that runs automatically every hour
// It checks all tasks that have passed their due date and marks them as OVERDUE
//
// WHY: The assignment says overdue must be detected via background job,
//      NOT on page load. This is the correct way.

import cron from 'node-cron'
import prisma from '../lib/prisma'

export function startOverdueJob() {
  // This schedule means: run every hour at the start of the hour
  // '0 * * * *' = minute 0, every hour, every day, every month, every weekday
  cron.schedule('0 * * * *', async () => {
    console.log('Running overdue task check...')

    try {
      const now = new Date()

      // Find all tasks where:
      // - Due date has passed
      // - Status is not DONE or OVERDUE already
      const result = await prisma.task.updateMany({
        where: {
          dueDate: { lt: now },           // Due date is in the past
          status: { notIn: ['DONE', 'OVERDUE'] }, // Not already done or overdue
          isOverdue: false                // Not already flagged
        },
        data: {
          status: 'OVERDUE',
          isOverdue: true
        }
      })

      if (result.count > 0) {
        console.log(`Marked ${result.count} task(s) as overdue.`)
      } else {
        console.log('No new overdue tasks found.')
      }
    } catch (error) {
      console.error('Overdue job error:', error)
    }
  })

  console.log('Overdue task checker started (runs every hour)')
}
