// Reset database by deleting courses created as 'guest'
import mongoose from 'mongoose';
import Course from './models/Course.js';
import dotenv from 'dotenv';
import logger from './utils/logger.js';

dotenv.config();

async function resetCourses() {
  try {
    logger.info('\n=== RESETTING DATABASE - DELETING GUEST COURSES ===\n');

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/CareerOs');
    logger.info('✅ Connected to MongoDB\n');

    // Find all courses created as 'guest'
    const guestCourses = await Course.find({ userId: 'guest' });
    logger.info(`Found ${guestCourses.length} courses with userId: 'guest'`);
    guestCourses.forEach((course, idx) => {
      logger.debug(`  ${idx + 1}. ${course.title} (created: ${course.createdAt})`);
    });

    if (guestCourses.length > 0) {
      // Delete them
      const result = await Course.deleteMany({ userId: 'guest' });
      logger.info(`\n✅ Deleted ${result.deletedCount} guest courses\n`);
    }

    // Show remaining courses
    const remaining = await Course.find().select('_id title userId userEmail');
    logger.info(`📚 Remaining courses in database: ${remaining.length}`);
    remaining.forEach((course, idx) => {
      logger.debug(`  ${idx + 1}. ${course.title}`);
      logger.debug(`     - userId: ${course.userId}`);
      logger.debug(`     - userEmail: ${course.userEmail}`);
    });

    logger.info('\n✅ DATABASE RESET COMPLETE\n');
    process.exit(0);
  } catch (error) {
    logger.error('❌ Error:', error);
    process.exit(1);
  }
}

resetCourses();
