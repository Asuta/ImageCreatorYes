const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

test('DirectML wrapper forwards an explicit model argument when provided', () => {
  const wrapper = fs.readFileSync(
    path.join(__dirname, '../tools/braindead-cutout-dml.cmd'),
    'utf8',
  );

  assert.match(wrapper, /if "%~2"=="" \(/i);
  assert.match(wrapper, /set BRAINDEAD_BG_MODEL=%~2/i);
  assert.match(wrapper, /"%SCRIPT_DIR%braindead_cutout\.py" "%~1" "%BRAINDEAD_BG_MODEL%"/i);
});
