"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Starting database seeding...');
    await prisma.response.deleteMany();
    await prisma.attempt.deleteMany();
    await prisma.choice.deleteMany();
    await prisma.question.deleteMany();
    await prisma.quiz.deleteMany();
    await prisma.completion.deleteMany();
    await prisma.enrollment.deleteMany();
    await prisma.lesson.deleteMany();
    await prisma.section.deleteMany();
    await prisma.course.deleteMany();
    await prisma.student.deleteMany();
    await prisma.teacher.deleteMany();
    await prisma.parent.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany();
    console.log('🧹 Cleared existing data');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const adminUser = await prisma.user.create({
        data: {
            email: 'admin@learnapp.com',
            name: 'System Administrator',
            password: hashedPassword,
            role: client_1.Role.ADMIN,
        },
    });
    console.log('👤 Created admin user');
    const teacher1User = await prisma.user.create({
        data: {
            email: 'john.teacher@learnapp.com',
            name: 'John Smith',
            password: hashedPassword,
            role: client_1.Role.TEACHER,
        },
    });
    const teacher2User = await prisma.user.create({
        data: {
            email: 'sarah.teacher@learnapp.com',
            name: 'Sarah Johnson',
            password: hashedPassword,
            role: client_1.Role.TEACHER,
        },
    });
    const teacher1 = await prisma.teacher.create({
        data: {
            userId: teacher1User.id,
        },
    });
    const teacher2 = await prisma.teacher.create({
        data: {
            userId: teacher2User.id,
        },
    });
    console.log('👨‍🏫 Created teacher users and profiles');
    const parentUser = await prisma.user.create({
        data: {
            email: 'parent@learnapp.com',
            name: 'Mary Wilson',
            password: hashedPassword,
            role: client_1.Role.PARENT,
        },
    });
    const parent = await prisma.parent.create({
        data: {
            userId: parentUser.id,
        },
    });
    console.log('👩‍👧‍👦 Created parent user and profile');
    const student1User = await prisma.user.create({
        data: {
            email: 'alice.student@learnapp.com',
            name: 'Alice Wilson',
            password: hashedPassword,
            role: client_1.Role.STUDENT,
        },
    });
    const student2User = await prisma.user.create({
        data: {
            email: 'bob.student@learnapp.com',
            name: 'Bob Wilson',
            password: hashedPassword,
            role: client_1.Role.STUDENT,
        },
    });
    const student3User = await prisma.user.create({
        data: {
            email: 'charlie.student@learnapp.com',
            name: 'Charlie Brown',
            password: hashedPassword,
            role: client_1.Role.STUDENT,
        },
    });
    const student1 = await prisma.student.create({
        data: {
            userId: student1User.id,
            parentId: parent.id,
        },
    });
    const student2 = await prisma.student.create({
        data: {
            userId: student2User.id,
            parentId: parent.id,
        },
    });
    const student3 = await prisma.student.create({
        data: {
            userId: student3User.id,
        },
    });
    console.log('👨‍🎓 Created student users and profiles');
    const mathCourse = await prisma.course.create({
        data: {
            title: 'Introduction to Mathematics',
            description: 'Learn the fundamentals of mathematics including algebra, geometry, and basic calculus.',
            teacherId: teacher1.id,
        },
    });
    const scienceCourse = await prisma.course.create({
        data: {
            title: 'Basic Science Concepts',
            description: 'Explore the world of science through physics, chemistry, and biology basics.',
            teacherId: teacher2.id,
        },
    });
    const englishCourse = await prisma.course.create({
        data: {
            title: 'English Literature',
            description: 'Dive into classic and modern literature while improving reading and writing skills.',
            teacherId: teacher1.id,
        },
    });
    console.log('📚 Created courses');
    const mathSection1 = await prisma.section.create({
        data: {
            title: 'Algebra Basics',
            order: 1,
            courseId: mathCourse.id,
        },
    });
    const mathSection2 = await prisma.section.create({
        data: {
            title: 'Geometry Fundamentals',
            order: 2,
            courseId: mathCourse.id,
        },
    });
    const scienceSection1 = await prisma.section.create({
        data: {
            title: 'Physics Introduction',
            order: 1,
            courseId: scienceCourse.id,
        },
    });
    const scienceSection2 = await prisma.section.create({
        data: {
            title: 'Chemistry Basics',
            order: 2,
            courseId: scienceCourse.id,
        },
    });
    const englishSection1 = await prisma.section.create({
        data: {
            title: 'Classic Literature',
            order: 1,
            courseId: englishCourse.id,
        },
    });
    console.log('📖 Created course sections');
    await prisma.lesson.create({
        data: {
            title: 'Introduction to Variables',
            content: 'In this lesson, we will learn about variables and how they are used in algebraic expressions.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            order: 1,
            sectionId: mathSection1.id,
        },
    });
    await prisma.lesson.create({
        data: {
            title: 'Solving Linear Equations',
            content: 'Learn how to solve linear equations step by step with practical examples.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            order: 2,
            sectionId: mathSection1.id,
        },
    });
    await prisma.lesson.create({
        data: {
            title: 'Basic Geometric Shapes',
            content: 'Explore different geometric shapes and their properties.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            order: 1,
            sectionId: mathSection2.id,
        },
    });
    await prisma.lesson.create({
        data: {
            title: 'Newton\'s Laws of Motion',
            content: 'Understanding the three fundamental laws that govern motion in physics.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            order: 1,
            sectionId: scienceSection1.id,
        },
    });
    await prisma.lesson.create({
        data: {
            title: 'Atomic Structure',
            content: 'Learn about atoms, electrons, protons, and neutrons.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            order: 1,
            sectionId: scienceSection2.id,
        },
    });
    await prisma.lesson.create({
        data: {
            title: 'Shakespeare\'s Romeo and Juliet',
            content: 'An introduction to one of Shakespeare\'s most famous plays.',
            videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            order: 1,
            sectionId: englishSection1.id,
        },
    });
    console.log('📝 Created lessons');
    await prisma.enrollment.create({
        data: {
            studentId: student1.id,
            courseId: mathCourse.id,
        },
    });
    await prisma.enrollment.create({
        data: {
            studentId: student1.id,
            courseId: scienceCourse.id,
        },
    });
    await prisma.enrollment.create({
        data: {
            studentId: student2.id,
            courseId: mathCourse.id,
        },
    });
    await prisma.enrollment.create({
        data: {
            studentId: student2.id,
            courseId: englishCourse.id,
        },
    });
    await prisma.enrollment.create({
        data: {
            studentId: student3.id,
            courseId: scienceCourse.id,
        },
    });
    console.log('📋 Created student enrollments');
    const mathQuiz = await prisma.quiz.create({
        data: {
            title: 'Algebra Basics Quiz',
            courseId: mathCourse.id,
            duration: 1800,
            attemptsAllowed: 2,
        },
    });
    const question1 = await prisma.question.create({
        data: {
            quizId: mathQuiz.id,
            text: 'What is the value of x in the equation: 2x + 5 = 15?',
            order: 1,
        },
    });
    const question2 = await prisma.question.create({
        data: {
            quizId: mathQuiz.id,
            text: 'Which of the following is a linear equation?',
            order: 2,
        },
    });
    await prisma.choice.create({
        data: {
            questionId: question1.id,
            label: 'A',
            text: 'x = 5',
            correct: true,
        },
    });
    await prisma.choice.create({
        data: {
            questionId: question1.id,
            label: 'B',
            text: 'x = 10',
            correct: false,
        },
    });
    await prisma.choice.create({
        data: {
            questionId: question1.id,
            label: 'C',
            text: 'x = 7.5',
            correct: false,
        },
    });
    await prisma.choice.create({
        data: {
            questionId: question1.id,
            label: 'D',
            text: 'x = 2.5',
            correct: false,
        },
    });
    await prisma.choice.create({
        data: {
            questionId: question2.id,
            label: 'A',
            text: 'y = x²',
            correct: false,
        },
    });
    await prisma.choice.create({
        data: {
            questionId: question2.id,
            label: 'B',
            text: 'y = 2x + 3',
            correct: true,
        },
    });
    await prisma.choice.create({
        data: {
            questionId: question2.id,
            label: 'C',
            text: 'y = x³ - 1',
            correct: false,
        },
    });
    await prisma.choice.create({
        data: {
            questionId: question2.id,
            label: 'D',
            text: 'y = √x',
            correct: false,
        },
    });
    console.log('❓ Created quiz with questions and choices');
    const scienceQuiz = await prisma.quiz.create({
        data: {
            title: 'Physics Fundamentals Quiz',
            courseId: scienceCourse.id,
            duration: 1200,
            attemptsAllowed: 1,
        },
    });
    const scienceQuestion = await prisma.question.create({
        data: {
            quizId: scienceQuiz.id,
            text: 'According to Newton\'s first law, an object at rest will:',
            order: 1,
        },
    });
    await prisma.choice.create({
        data: {
            questionId: scienceQuestion.id,
            label: 'A',
            text: 'Always start moving',
            correct: false,
        },
    });
    await prisma.choice.create({
        data: {
            questionId: scienceQuestion.id,
            label: 'B',
            text: 'Stay at rest unless acted upon by a force',
            correct: true,
        },
    });
    await prisma.choice.create({
        data: {
            questionId: scienceQuestion.id,
            label: 'C',
            text: 'Move in a circle',
            correct: false,
        },
    });
    await prisma.choice.create({
        data: {
            questionId: scienceQuestion.id,
            label: 'D',
            text: 'Accelerate constantly',
            correct: false,
        },
    });
    console.log('🔬 Created science quiz');
    console.log('✅ Database seeding completed successfully!');
    console.log('\n📊 Summary of created data:');
    console.log('- 1 Admin user (admin@learnapp.com)');
    console.log('- 2 Teacher users (john.teacher@learnapp.com, sarah.teacher@learnapp.com)');
    console.log('- 1 Parent user (parent@learnapp.com)');
    console.log('- 3 Student users (alice.student@learnapp.com, bob.student@learnapp.com, charlie.student@learnapp.com)');
    console.log('- 3 Courses (Mathematics, Science, English)');
    console.log('- 5 Sections across all courses');
    console.log('- 6 Lessons with video content');
    console.log('- 5 Student enrollments');
    console.log('- 2 Quizzes with multiple choice questions');
    console.log('\n🔑 All users have the password: password123');
}
main()
    .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
})
    .finally(async () => {
    await prisma.$disconnect();
});
//# sourceMappingURL=seed.js.map