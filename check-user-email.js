// Check user email in database and course linkage
import mongoose from 'mongoose';
import User from './models/User.js';
import Course from './models/Course.js';
import UserEnrollment from './models/UserEnrollment.js';
import dotenv from 'dotenv';
import logger from './utils/logger.js';

dotenv.config();

async function checkUserEmail() {
  try {
    logger.info('\n=== CHECKING DATABASE FOR USER AND COURSE DATA ===\n');
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/CareerOs');
    logger.info('✅ Connected to MongoDB\n');

    // 1. Get all users
    logger.info('📋 USERS IN DATABASE:');
    const users = await User.find().select('_id email name').lean();
    logger.info(`Found ${users.length} users:`);
    users.forEach((user, idx) => {
      logger.debug(`  ${idx + 1}. Email: ${user.email}, ID: ${user._id}, Name: ${user.name}`);
    });

    // 2. Get all courses
    logger.info('\n📚 COURSES IN DATABASE:');
    const courses = await Course.find().select('_id title user userId userEmail createdAt').lean();
    logger.info(`Found ${courses.length} courses:`);
    courses.forEach((course, idx) => {
      logger.debug(`  ${idx + 1}. Title: ${course.title}`);
      logger.debug(`     - user (ObjectId): ${course.user}`);
      logger.debug(`     - userId (String): ${course.userId}`);
      logger.debug(`     - userEmail: ${course.userEmail}`);
      logger.debug(`     - Created: ${course.createdAt}`);
    });

    // 3. Get enrollments
    logger.info('\n📝 ENROLLMENTS IN DATABASE:');
    const enrollments = await UserEnrollment.find().select('_id userId userEmail courseId courseTitle type createdAt').lean();
    logger.info(`Found ${enrollments.length} enrollments:`);
    enrollments.forEach((enrollment, idx) => {
      logger.debug(`  ${idx + 1}. Type: ${enrollment.type}, CourseTitle: ${enrollment.courseTitle}`);
      logger.debug(`     - userId: ${enrollment.userId}`);
      logger.debug(`     - userEmail: ${enrollment.userEmail}`);
      logger.debug(`     - Created: ${enrollment.createdAt}`);
    });

    // 4. Check if first user has any courses
    if (users.length > 0) {
      const firstUser = users[0];
      logger.info(`\n🔍 CHECKING COURSES FOR USER: ${firstUser.email}`);
      
      const userCourses = await Course.find({
        $or: [
          { user: firstUser._id },
          { userId: firstUser._id.toString() },
          { userEmail: firstUser.email }
        ]
      }).select('_id title userEmail').lean();
      
      logger.info(`Found ${userCourses.length} courses linked to this user`);
      userCourses.forEach((course, idx) => {
        logger.debug(`  ${idx + 1}. ${course.title} (userEmail: ${course.userEmail})`);
      });
    }

    // 5. Example query that profile endpoint would use
    if (users.length > 0) {
      const firstUser = users[0];
      const userId = firstUser._id.toString();
      
      logger.info(`\n📊 PROFILE QUERY FOR USER ${firstUser.email}:`);
      logger.debug(`Query: { $or: [{ user: "${userId}" }, { userId: "${userId}" }, { userEmail: "${firstUser.email}" }] }`);
      
      const profileCourses = await Course.find({
        $or: [
          { user: userId },
          { userId: userId },
          { userEmail: firstUser.email }
        ]
      }).select('_id title user userId userEmail').lean();
      
      logger.info(`Would return ${profileCourses.length} courses`);
      profileCourses.forEach((course, idx) => {
        logger.debug(`  ${idx + 1}. ${course.title}`);
      });
    }

    logger.info('\n✅ CHECK COMPLETE');
    
  } catch (error) {
    logger.error('❌ Error:', error);
  } finally {
    await mongoose.disconnect();
  }
}

checkUserEmail();
