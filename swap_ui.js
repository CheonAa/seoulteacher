const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src/app/(dashboard)/admin/students/new/StudentForm.tsx');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace "미지원 과목" with "과목명 미지정 (하단 입력)"
content = content.replace(/"미지원 과목"/g, '"과목명 미지정 (하단에 입력)"');

// Find calculator block
const calcStart = content.indexOf('            <div>\n                <h3 className="text-lg font-medium text-slate-900 border-b border-slate-200 pb-2 mb-4 flex items-center">\n                    <Calculator className="w-5 h-5 mr-2 text-blue-600" />\n                    수강료 자동 계산기 (선택)\n                </h3>');
// The calculator block ends at `            </div>\n\n            <div>\n                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">\n                    <h3 className="text-lg font-medium text-slate-900">\n                        수강 등록 정보 (Enrollment)\n                    </h3>`

const enrollStart = content.indexOf('            <div>\n                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-4">\n                    <h3 className="text-lg font-medium text-slate-900">\n                        수강 등록 정보 (Enrollment)\n                    </h3>');

const buttonsStart = content.indexOf('            <div className="flex items-center justify-end space-x-3 pt-6 border-t border-slate-200">');

if (calcStart !== -1 && enrollStart !== -1 && buttonsStart !== -1 && calcStart < enrollStart && enrollStart < buttonsStart) {
    const calcBlock = content.substring(calcStart, enrollStart);
    const enrollBlock = content.substring(enrollStart, buttonsStart);
    
    // Swap them
    const beforeCalc = content.substring(0, calcStart);
    const afterButtons = content.substring(buttonsStart);
    
    // Also, adjust margin/padding if needed, but they both start with `            <div>` and end with `            </div>` and a newline.
    // They are separated by `\n\n`.
    const newContent = beforeCalc + enrollBlock + "\n" + calcBlock + afterButtons;
    
    // Replace "(하단에 입력)" with "(위쪽에 입력)" since we moved it!
    const updatedContent = newContent.replace(/"과목명 미지정 \(하단에 입력\)"/g, '"과목명 미지정 (먼저 등록해주세요)"');
    
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
    console.log("Success");
} else {
    console.error("Could not find the blocks to swap accurately.");
    // Just save the replaced string 
    const updatedContent = content.replace(/"과목명 미지정 \(하단에 입력\)"/g, '"과목명 미지정 (하단에 등록할 이름)"');
    fs.writeFileSync(filePath, updatedContent, 'utf-8');
}
