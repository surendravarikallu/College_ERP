const fs = require('fs');
const path = require('path');

const inputPath = path.join(__dirname, 'backup_extracted.sql');
const outputPath = path.join(__dirname, 'backup_transformed.sql');

const mappings = {
  'public.admins': 'public.ec_admins',
  'public.students': 'public.ec_students',
  'public.subjects': 'public.ec_subjects',
  'public.exams': 'public.ec_exams',
  'public.results': 'public.ec_results',
  'public.mid_marks': 'public.ec_mid_marks',
  'public.lab_internal_marks': 'public.ec_lab_internal_marks',
  'public.faculty_mappings': 'public.ec_faculty_mappings',
  'public.nominal_rolls': 'public.ec_nominal_rolls',
  'public.global_settings': 'public.ec_global_settings',
  'public.promotion_history': 'public.ec_promotion_history'
};

console.log('Reading extracted SQL...');
let content = fs.readFileSync(inputPath, 'utf8');

console.log('Applying mappings...');
for (const [oldName, newName] of Object.entries(mappings)) {
  const regex = new RegExp(oldName.replace('.', '\\.'), 'g');
  console.log(`Mapping ${oldName} -> ${newName}`);
  content = content.replace(regex, newName);
}

// Add DROP statements at the top to ensure CREATE TABLE succeeds
const dropStmt = `
-- DROP TABLES BEFORE IMPORT TO ENSURE CREATE TABLE SUCCEEDS
DROP TABLE IF EXISTS public.ec_admins, public.ec_students, public.ec_subjects, public.ec_exams, public.ec_results, 
                     public.ec_mid_marks, public.ec_lab_internal_marks, public.ec_faculty_mappings, public.ec_nominal_rolls, 
                     public.ec_global_settings, public.ec_promotion_history CASCADE;
`;

content = dropStmt + content;

console.log('Saving transformed SQL...');
fs.writeFileSync(outputPath, content);
console.log('Success!');
