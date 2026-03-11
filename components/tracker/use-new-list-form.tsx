import { useRouter } from 'expo-router';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { useListActions, useListsQuery } from '@/contexts/lists-context';
import {
  createListAutomationBlock,
  createListConfig,
  DEFAULT_LIST_CONFIG,
  type ListAddonId,
  type ListAutomationBlock,
  type ListConfig,
  type ListFieldDefinition,
  type ListFieldKind,
  type ListTemplate,
} from '@/data/mock-lists';

export type NewListCreateMode = 'scratch' | 'template';

export interface NewListFormController {
  sessionId: string | null;
  formRevision: number;
  title: string;
  description: string;
  createMode: NewListCreateMode;
  selectedTemplateId: string | null;
  selectedTemplate: ListTemplate | null;
  draftConfig: ListConfig;
  saveAsTemplate: boolean;
  templateTitle: string;
  templateDescription: string;
  listTemplates: ListTemplate[];
  canSubmit: boolean;
  setTitle: (value: string) => void;
  setDescription: (value: string) => void;
  setCreateMode: (mode: NewListCreateMode) => void;
  selectTemplate: (templateId: string) => void;
  toggleAddon: (addonId: ListAddonId) => void;
  setDefaultEntryType: (value: ListConfig['defaultEntryType']) => void;
  addAutomationBlock: () => void;
  updateAutomationBlock: (blockId: string, updates: Partial<ListAutomationBlock>) => void;
  removeAutomationBlock: (blockId: string) => void;
  addField: () => void;
  updateField: (fieldId: string, updates: Partial<ListFieldDefinition>) => void;
  updateFieldKind: (fieldId: string, kind: ListFieldKind) => void;
  removeField: (fieldId: string) => void;
  setSaveAsTemplate: (value: boolean) => void;
  setTemplateTitle: (value: string) => void;
  setTemplateDescription: (value: string) => void;
  beginSession: (sessionId: string) => void;
  reset: () => void;
  cancel: () => void;
  submit: () => void;
}

const NewListFormContext = createContext<NewListFormController | null>(null);

function createNewFieldDefinition(): ListFieldDefinition {
  return {
    id: `field-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    label: '',
    kind: 'text',
  };
}

function useNewListFormController(): NewListFormController {
  const router = useRouter();
  const { listTemplates } = useListsQuery();
  const { createList, createListFromTemplate, saveListAsTemplate, updateList } = useListActions();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [formRevision, setFormRevision] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [createMode, setCreateModeState] = useState<NewListCreateMode>('scratch');
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [draftConfig, setDraftConfig] = useState<ListConfig>(createListConfig(DEFAULT_LIST_CONFIG));
  const [saveAsTemplate, setSaveAsTemplate] = useState(false);
  const [templateTitle, setTemplateTitle] = useState('');
  const [templateDescription, setTemplateDescription] = useState('');

  const selectedTemplate =
    listTemplates.find((template) => template.id === selectedTemplateId) ?? null;

  const bumpRevision = useCallback(() => {
    setFormRevision((current) => current + 1);
  }, []);

  const reset = useCallback(() => {
    setSessionId(null);
    setTitle('');
    setDescription('');
    setCreateModeState('scratch');
    setSelectedTemplateId(null);
    setDraftConfig(createListConfig(DEFAULT_LIST_CONFIG));
    setSaveAsTemplate(false);
    setTemplateTitle('');
    setTemplateDescription('');
    bumpRevision();
  }, [bumpRevision]);

  const beginSession = useCallback(
    (nextSessionId: string) => {
      setSessionId((current) => {
        if (current === nextSessionId) {
          return current;
        }

        setTitle('');
        setDescription('');
        setCreateModeState('scratch');
        setSelectedTemplateId(null);
        setDraftConfig(createListConfig(DEFAULT_LIST_CONFIG));
        setSaveAsTemplate(false);
        setTemplateTitle('');
        setTemplateDescription('');
        bumpRevision();
        return nextSessionId;
      });
    },
    [bumpRevision]
  );

  const updateConfig = useCallback((updater: (current: ListConfig) => ListConfig) => {
    setDraftConfig((current) => createListConfig(updater(current)));
  }, []);

  const setCreateMode = useCallback((mode: NewListCreateMode) => {
    if (mode === 'scratch') {
      setCreateModeState('scratch');
      setSelectedTemplateId(null);
      setDraftConfig(createListConfig(DEFAULT_LIST_CONFIG));
      return;
    }

    setCreateModeState('template');
  }, []);

  const selectTemplate = useCallback(
    (templateId: string) => {
      const template = listTemplates.find((item) => item.id === templateId);
      if (!template) {
        return;
      }

      let didBackfill = false;

      setCreateModeState('template');
      setSelectedTemplateId(template.id);
      setDraftConfig(createListConfig(template.config));

      if (!title.trim()) {
        setTitle(template.title);
        didBackfill = true;
      }

      if (!description.trim()) {
        setDescription(template.description);
        didBackfill = true;
      }

      if (didBackfill) {
        bumpRevision();
      }
    },
    [bumpRevision, description, listTemplates, title]
  );

  const toggleAddon = useCallback(
    (addonId: ListAddonId) => {
      updateConfig((current) => {
        const isEnabled = current.addons.includes(addonId);
        const nextAddons = isEnabled
          ? current.addons.filter((item) => item !== addonId)
          : [...current.addons, addonId];
        return {
          ...current,
          addons: nextAddons,
        };
      });
    },
    [updateConfig]
  );

  const setDefaultEntryType = useCallback(
    (value: ListConfig['defaultEntryType']) => {
      updateConfig((current) => ({
        ...current,
        defaultEntryType: value,
      }));
    },
    [updateConfig]
  );

  const addAutomationBlock = useCallback(() => {
    updateConfig((current) => ({
      ...current,
      automationBlocks: [...current.automationBlocks, createListAutomationBlock()],
    }));
  }, [updateConfig]);

  const updateAutomationBlock = useCallback(
    (blockId: string, updates: Partial<ListAutomationBlock>) => {
      updateConfig((current) => ({
        ...current,
        automationBlocks: current.automationBlocks.map((block) =>
          block.id === blockId ? { ...block, ...updates } : block
        ),
      }));
    },
    [updateConfig]
  );

  const removeAutomationBlock = useCallback(
    (blockId: string) => {
      updateConfig((current) => ({
        ...current,
        automationBlocks: current.automationBlocks.filter((block) => block.id !== blockId),
      }));
    },
    [updateConfig]
  );

  const addField = useCallback(() => {
    updateConfig((current) => ({
      ...current,
      addons: current.addons.includes('custom-fields')
        ? current.addons
        : [...current.addons, 'custom-fields'],
      fieldDefinitions: [...current.fieldDefinitions, createNewFieldDefinition()],
    }));
  }, [updateConfig]);

  const updateField = useCallback(
    (fieldId: string, updates: Partial<ListFieldDefinition>) => {
      updateConfig((current) => ({
        ...current,
        fieldDefinitions: current.fieldDefinitions.map((field) =>
          field.id === fieldId ? { ...field, ...updates } : field
        ),
      }));
    },
    [updateConfig]
  );

  const updateFieldKind = useCallback(
    (fieldId: string, kind: ListFieldKind) => {
      updateField(fieldId, { kind });
    },
    [updateField]
  );

  const removeField = useCallback(
    (fieldId: string) => {
      updateConfig((current) => ({
        ...current,
        fieldDefinitions: current.fieldDefinitions.filter((field) => field.id !== fieldId),
      }));
    },
    [updateConfig]
  );

  const cancel = useCallback(() => {
    reset();
    router.back();
  }, [reset, router]);

  const submit = useCallback(() => {
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      return;
    }

    const trimmedDescription = description.trim() || undefined;
    if (createMode === 'template' && !selectedTemplateId) {
      return;
    }

    const createdListId =
      createMode === 'template' && selectedTemplateId
        ? createListFromTemplate(selectedTemplateId, {
            title: trimmedTitle,
            description: trimmedDescription,
          })
        : createList(trimmedTitle, {
            config: draftConfig,
            description: trimmedDescription,
            templateId: selectedTemplateId ?? undefined,
          });

    if (createdListId && createMode === 'template') {
      updateList(createdListId, {
        config: draftConfig,
      });
    }

    if (createdListId && saveAsTemplate && templateTitle.trim()) {
      saveListAsTemplate(createdListId, {
        title: templateTitle.trim(),
        description: templateDescription.trim() || `${trimmedTitle} setup`,
      });
    }

    if (!createdListId) {
      return;
    }

    reset();
    router.back();
  }, [
    createList,
    createListFromTemplate,
    createMode,
    description,
    draftConfig,
    reset,
    router,
    saveAsTemplate,
    saveListAsTemplate,
    selectedTemplateId,
    templateDescription,
    templateTitle,
    title,
    updateList,
  ]);

  const canSubmit = useMemo(() => {
    return title.trim().length > 0 && (createMode !== 'template' || !!selectedTemplateId);
  }, [createMode, selectedTemplateId, title]);

  return useMemo(
    () => ({
      sessionId,
      formRevision,
      title,
      description,
      createMode,
      selectedTemplateId,
      selectedTemplate,
      draftConfig,
      saveAsTemplate,
      templateTitle,
      templateDescription,
      listTemplates,
      canSubmit,
      setTitle,
      setDescription,
      setCreateMode,
      selectTemplate,
      toggleAddon,
      setDefaultEntryType,
      addAutomationBlock,
      updateAutomationBlock,
      removeAutomationBlock,
      addField,
      updateField,
      updateFieldKind,
      removeField,
      setSaveAsTemplate,
      setTemplateTitle,
      setTemplateDescription,
      beginSession,
      reset,
      cancel,
      submit,
    }),
    [
      addField,
      beginSession,
      cancel,
      canSubmit,
      createMode,
      description,
      draftConfig,
      formRevision,
      listTemplates,
      removeField,
      reset,
      saveAsTemplate,
      sessionId,
      selectTemplate,
      selectedTemplate,
      selectedTemplateId,
      setCreateMode,
      setDefaultEntryType,
      addAutomationBlock,
      updateAutomationBlock,
      removeAutomationBlock,
      submit,
      templateDescription,
      templateTitle,
      title,
      toggleAddon,
      updateField,
      updateFieldKind,
    ]
  );
}

export function NewListFormProvider({ children }: { children: React.ReactNode }) {
  const value = useNewListFormController();
  return <NewListFormContext.Provider value={value}>{children}</NewListFormContext.Provider>;
}

export function useNewListForm(): NewListFormController {
  const context = useContext(NewListFormContext);
  if (!context) {
    throw new Error('useNewListForm must be used within NewListFormProvider');
  }
  return context;
}
