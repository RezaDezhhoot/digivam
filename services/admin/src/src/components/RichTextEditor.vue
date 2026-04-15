<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue';

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: 'متن قرارداد را از اینجا تنظیم کنید...'
  },
  minHeight: {
    type: Number,
    default: 280
  }
});

const emit = defineEmits(['update:modelValue', 'focus', 'blur']);

const editorRef = ref(null);

const createTableCell = (tagName, index) => {
  const cell = document.createElement(tagName);
  cell.innerHTML = tagName === 'TH' ? `ستون ${index + 1}` : `مقدار ${index + 1}`;
  return cell;
};

const hasContent = computed(() =>
  String(props.modelValue || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim().length > 0
);

const syncFromModel = () => {
  if (!editorRef.value) {
    return;
  }

  const nextHtml = String(props.modelValue || '');
  if (editorRef.value.innerHTML !== nextHtml) {
    editorRef.value.innerHTML = nextHtml;
  }
};

const emitValue = () => {
  emit('update:modelValue', editorRef.value?.innerHTML || '');
};

const focusEditor = async () => {
  await nextTick();
  editorRef.value?.focus();
};

const exec = async (command, value = null) => {
  await focusEditor();

  try {
    document.execCommand('styleWithCSS', false, command === 'hiliteColor');
  } catch {
    // ignore unsupported style mode
  }

  document.execCommand(command, false, value);
  emitValue();
};

const formatBlock = (tagName) => exec('formatBlock', tagName);
const clearFormatting = () => exec('removeFormat');
const insertVariable = (token) => exec('insertText', token);
const insertHtml = (html) => exec('insertHTML', html);

const getSelectionNode = () => {
  const selection = window.getSelection();

  if (!selection || !selection.rangeCount) {
    return null;
  }

  const node = selection.getRangeAt(0).startContainer;
  return node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
};

const getTableContext = () => {
  const selectionNode = getSelectionNode();

  if (!selectionNode || !editorRef.value || !editorRef.value.contains(selectionNode)) {
    return null;
  }

  const cell = selectionNode.closest?.('td, th');
  if (!cell) {
    return null;
  }

  const row = cell.closest('tr');
  const table = cell.closest('table');
  if (!row || !table) {
    return null;
  }

  const cells = Array.from(row.children).filter((item) => item.matches('td, th'));
  const cellIndex = cells.indexOf(cell);

  if (cellIndex < 0) {
    return null;
  }

  return {
    table,
    row,
    cell,
    cellIndex,
    cells
  };
};

const selectCell = (cell) => {
  if (!cell) {
    emitValue();
    return;
  }

  const range = document.createRange();
  range.selectNodeContents(cell);
  range.collapse(true);

  const selection = window.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);

  editorRef.value?.focus();
  emitValue();
};

const insertTable = () => {
  insertHtml(`
    <table>
      <thead>
        <tr>
          <th>ستون 1</th>
          <th>ستون 2</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>مقدار 1</td>
          <td>مقدار 2</td>
        </tr>
        <tr>
          <td>مقدار 3</td>
          <td>مقدار 4</td>
        </tr>
      </tbody>
    </table>
  `);
};

const insertTableRow = (position = 'after') => {
  const context = getTableContext();
  if (!context) {
    return;
  }

  const newRow = context.row.cloneNode(true);

  Array.from(newRow.children).forEach((item, index) => {
    if (!item.matches('td, th')) {
      return;
    }

    item.innerHTML = item.tagName === 'TH' ? `ستون ${index + 1}` : `مقدار ${index + 1}`;
  });

  context.row.parentElement?.insertBefore(
    newRow,
    position === 'before' ? context.row : context.row.nextSibling
  );

  selectCell(newRow.children[Math.min(context.cellIndex, newRow.children.length - 1)]);
};

const removeTableRow = () => {
  const context = getTableContext();
  if (!context) {
    return;
  }

  const rows = Array.from(context.table.querySelectorAll('tr'));
  if (rows.length <= 1) {
    return;
  }

  const rowIndex = rows.indexOf(context.row);
  const fallbackRow = rows[rowIndex + 1] || rows[rowIndex - 1] || null;
  const currentSection = context.row.parentElement;

  context.row.remove();

  if (currentSection && currentSection !== context.table && !currentSection.querySelector('tr')) {
    currentSection.remove();
  }

  const nextCell = fallbackRow?.children[Math.min(context.cellIndex, Math.max(fallbackRow.children.length - 1, 0))] || null;
  selectCell(nextCell);
};

const insertTableColumn = (position = 'after') => {
  const context = getTableContext();
  if (!context) {
    return;
  }

  let targetCell = null;

  Array.from(context.table.querySelectorAll('tr')).forEach((row) => {
    const rowCells = Array.from(row.children).filter((item) => item.matches('td, th'));
    const referenceCell = rowCells[Math.min(context.cellIndex, Math.max(rowCells.length - 1, 0))] || null;
    const tagName = row.closest('thead') || referenceCell?.tagName === 'TH' ? 'TH' : 'TD';
    const newCell = createTableCell(tagName, position === 'before' ? context.cellIndex : context.cellIndex + 1);

    if (!referenceCell) {
      row.appendChild(newCell);
    } else {
      row.insertBefore(newCell, position === 'before' ? referenceCell : referenceCell.nextSibling);
    }

    if (row === context.row) {
      targetCell = newCell;
    }
  });

  selectCell(targetCell);
};

const removeTableColumn = () => {
  const context = getTableContext();
  if (!context || context.cells.length <= 1) {
    return;
  }

  let targetCell = null;

  Array.from(context.table.querySelectorAll('tr')).forEach((row) => {
    const rowCells = Array.from(row.children).filter((item) => item.matches('td, th'));
    const cellToRemove = rowCells[context.cellIndex] || rowCells[rowCells.length - 1] || null;

    if (!cellToRemove) {
      return;
    }

    if (row === context.row) {
      targetCell = rowCells[context.cellIndex + 1] || rowCells[context.cellIndex - 1] || null;
    }

    cellToRemove.remove();
  });

  selectCell(targetCell);
};

watch(() => props.modelValue, syncFromModel);

onMounted(syncFromModel);

defineExpose({
  focus: focusEditor,
  formatBlock,
  insertVariable,
  insertHtml,
  insertTable,
  insertTableColumn,
  insertTableRow,
  removeTableColumn,
  removeTableRow
});
</script>

<template>
  <div class="editor-shell">
    <div class="editor-toolbar">
      <div class="editor-toolbar-group">
        <button type="button" class="toolbar-btn" title="پاراگراف" @mousedown.prevent @click="formatBlock('p')">
          <i class="fa-solid fa-paragraph"></i>
        </button>
        <button type="button" class="toolbar-btn" title="تیتر" @mousedown.prevent @click="formatBlock('h3')">
          <i class="fa-solid fa-heading"></i>
        </button>
      </div>

      <div class="editor-toolbar-group">
        <button type="button" class="toolbar-btn" title="بولد" @mousedown.prevent @click="exec('bold')">
          <i class="fa-solid fa-bold"></i>
        </button>
        <button type="button" class="toolbar-btn" title="ایتالیک" @mousedown.prevent @click="exec('italic')">
          <i class="fa-solid fa-italic"></i>
        </button>
        <button type="button" class="toolbar-btn" title="زیرخط" @mousedown.prevent @click="exec('underline')">
          <i class="fa-solid fa-underline"></i>
        </button>
        <button type="button" class="toolbar-btn" title="هایلایت" @mousedown.prevent @click="exec('hiliteColor', '#fff3a3')">
          <i class="fa-solid fa-highlighter"></i>
        </button>
      </div>

      <div class="editor-toolbar-group">
        <button type="button" class="toolbar-btn" title="لیست ترتیبی" @mousedown.prevent @click="exec('insertOrderedList')">
          <i class="fa-solid fa-list-ol"></i>
        </button>
        <button type="button" class="toolbar-btn" title="لیست نشانه ای" @mousedown.prevent @click="exec('insertUnorderedList')">
          <i class="fa-solid fa-list-ul"></i>
        </button>
        <button type="button" class="toolbar-btn" title="درج جدول" @mousedown.prevent @click="insertTable">
          <i class="fa-solid fa-table"></i>
        </button>
        <button type="button" class="toolbar-btn toolbar-btn-wide" title="افزودن ردیف بعد از محل فعلی" @mousedown.prevent @click="insertTableRow()">
          <i class="fa-solid fa-plus"></i>
          <span>ردیف</span>
        </button>
        <button type="button" class="toolbar-btn toolbar-btn-wide" title="حذف ردیف فعلی" @mousedown.prevent @click="removeTableRow">
          <i class="fa-solid fa-minus"></i>
          <span>ردیف</span>
        </button>
        <button type="button" class="toolbar-btn toolbar-btn-wide" title="افزودن ستون بعد از محل فعلی" @mousedown.prevent @click="insertTableColumn()">
          <i class="fa-solid fa-plus"></i>
          <span>ستون</span>
        </button>
        <button type="button" class="toolbar-btn toolbar-btn-wide" title="حذف ستون فعلی" @mousedown.prevent @click="removeTableColumn">
          <i class="fa-solid fa-minus"></i>
          <span>ستون</span>
        </button>
      </div>

      <div class="editor-toolbar-group">
        <button type="button" class="toolbar-btn" title="حذف فرمت" @mousedown.prevent @click="clearFormatting">
          <i class="fa-solid fa-eraser"></i>
        </button>
      </div>
    </div>

    <div class="editor-stage" :style="{ minHeight: `${minHeight}px` }">
      <div
        ref="editorRef"
        class="editor-content"
        contenteditable="true"
        @input="emitValue"
        @focus="$emit('focus')"
        @blur="$emit('blur')"
      ></div>
      <div v-if="!hasContent" class="editor-placeholder">{{ placeholder }}</div>
    </div>
  </div>
</template>

<style scoped src="./styles/RichTextEditor.css"></style>