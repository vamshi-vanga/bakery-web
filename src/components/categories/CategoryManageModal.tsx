import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { X, Plus, Edit2, Trash2, Check, Tags } from 'lucide-react-native';
import { useTheme } from '@/theme';
import { Button } from '@/components/ui/Button';
import { addCategory, renameCategory, deleteCategory } from '@/services/categories';
import { haptic } from '@/utils/haptics';

interface CategoryManageModalProps {
  visible: boolean;
  bakeryId: string;
  categories: string[];
  onClose: () => void;
  onCategoriesChanged: () => void;
}

export function CategoryManageModal({
  visible,
  bakeryId,
  categories,
  onClose,
  onCategoriesChanged,
}: CategoryManageModalProps) {
  const { colors, spacing, typography, borderRadius } = useTheme();

  const [newCatName, setNewCatName] = useState('');
  const [adding, setAdding] = useState(false);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatName, setEditCatName] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingCat, setDeletingCat] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAdd = async () => {
    if (!newCatName.trim()) return;
    setAdding(true);
    setErrorMessage(null);

    try {
      await addCategory(bakeryId, newCatName.trim());
      haptic.success();
      setNewCatName('');
      onCategoriesChanged();
    } catch (err: any) {
      haptic.error();
      setErrorMessage(err.message ?? 'Failed to add category.');
    } finally {
      setAdding(false);
    }
  };

  const handleStartEdit = (cat: string) => {
    haptic.light();
    setEditingCat(cat);
    setEditCatName(cat);
    setErrorMessage(null);
  };

  const handleSaveEdit = async () => {
    if (!editingCat || !editCatName.trim()) return;
    setSavingEdit(true);
    setErrorMessage(null);

    try {
      await renameCategory(bakeryId, editingCat, editCatName.trim());
      haptic.success();
      setEditingCat(null);
      setEditCatName('');
      onCategoriesChanged();
    } catch (err: any) {
      haptic.error();
      setErrorMessage(err.message ?? 'Failed to rename category.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = (cat: string) => {
    haptic.warning();
    Alert.alert(
      'Delete Category',
      `Are you sure you want to delete "${cat}"? Products in this category will be reassigned to "General".`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingCat(cat);
            setErrorMessage(null);
            try {
              await deleteCategory(bakeryId, cat);
              haptic.heavy();
              onCategoriesChanged();
            } catch (err: any) {
              haptic.error();
              setErrorMessage(err.message ?? 'Failed to delete category.');
            } finally {
              setDeletingCat(null);
            }
          },
        },
      ]
    );
  };

  // Filter out the virtual 'All' category
  const filteredCategories = categories.filter((c) => c !== 'All');

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={[styles.modalCard, { backgroundColor: colors.surface }]}>
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: colors.borderSubtle }]}>
            <View style={styles.headerTitleRow}>
              <Tags size={20} color={colors.primary} />
              <Text style={[typography.h3, { color: colors.text, marginLeft: 8 }]}>
                Manage Categories
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <X size={20} color={colors.textMuted} />
            </TouchableOpacity>
          </View>

          {errorMessage && (
            <View
              style={[
                styles.errorBox,
                {
                  backgroundColor: colors.dangerLight,
                  borderColor: colors.danger,
                  borderRadius: borderRadius.sm,
                  marginHorizontal: spacing.lg,
                  marginTop: spacing.md,
                },
              ]}
            >
              <Text style={[typography.caption, { color: colors.dangerText }]}>
                {errorMessage}
              </Text>
            </View>
          )}

          {/* Add Category Input */}
          <View style={[styles.addRow, { padding: spacing.lg }]}>
            <TextInput
              placeholder="Add new category (e.g. Gluten-Free)"
              placeholderTextColor={colors.textLight}
              value={newCatName}
              onChangeText={setNewCatName}
              style={[
                styles.input,
                {
                  backgroundColor: colors.surfaceSubtle,
                  borderColor: colors.border,
                  color: colors.text,
                  borderRadius: borderRadius.md,
                },
              ]}
              onSubmitEditing={handleAdd}
            />
            <Button
              title="Add"
              size="sm"
              loading={adding}
              onPress={handleAdd}
              disabled={!newCatName.trim()}
              icon={<Plus size={16} color="#FFFFFF" />}
              style={{ marginLeft: spacing.sm, height: 44 }}
            />
          </View>

          {/* Categories List */}
          <ScrollView
            contentContainerStyle={[styles.listContent, { paddingHorizontal: spacing.lg }]}
          >
            <Text style={[typography.captionBold, { color: colors.textMuted, marginBottom: 8 }]}>
              Existing Categories ({filteredCategories.length})
            </Text>

            {filteredCategories.map((cat) => {
              const isEditing = editingCat === cat;
              const isDeleting = deletingCat === cat;

              return (
                <View
                  key={cat}
                  style={[
                    styles.catRow,
                    {
                      borderColor: isEditing ? colors.primary : colors.borderSubtle,
                      backgroundColor: isEditing ? colors.primaryLight : colors.surfaceSubtle,
                      borderRadius: borderRadius.md,
                    },
                  ]}
                >
                  {isEditing ? (
                    <View style={styles.editRow}>
                      <TextInput
                        value={editCatName}
                        onChangeText={setEditCatName}
                        autoFocus
                        style={[
                          styles.editInput,
                          {
                            backgroundColor: colors.surface,
                            borderColor: colors.primary,
                            color: colors.text,
                            borderRadius: borderRadius.sm,
                          },
                        ]}
                      />
                      <TouchableOpacity
                        onPress={handleSaveEdit}
                        disabled={savingEdit || !editCatName.trim()}
                        style={[styles.actionBtn, { backgroundColor: colors.primary }]}
                      >
                        {savingEdit ? (
                          <ActivityIndicator size="small" color="#FFFFFF" />
                        ) : (
                          <Check size={16} color="#FFFFFF" />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => setEditingCat(null)}
                        style={[styles.actionBtn, { backgroundColor: colors.surfaceSubtle }]}
                      >
                        <X size={16} color={colors.textMuted} />
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <>
                      <Text style={[typography.bodyBold, { color: colors.text, flex: 1 }]}>
                        {cat}
                      </Text>
                      <View style={styles.actionsGroup}>
                        <TouchableOpacity
                          onPress={() => handleStartEdit(cat)}
                          style={[styles.iconButton, { backgroundColor: colors.surface }]}
                        >
                          <Edit2 size={16} color={colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleDelete(cat)}
                          disabled={isDeleting}
                          style={[styles.iconButton, { backgroundColor: colors.dangerLight }]}
                        >
                          {isDeleting ? (
                            <ActivityIndicator size="small" color={colors.danger} />
                          ) : (
                            <Trash2 size={16} color={colors.danger} />
                          )}
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              );
            })}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, { borderTopColor: colors.borderSubtle, padding: spacing.md }]}>
            <Button title="Done" variant="secondary" onPress={onClose} style={{ width: '100%' }} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '85%',
    minHeight: 380,
    maxWidth: 600,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeBtn: {
    padding: 6,
  },
  errorBox: {
    padding: 10,
    borderWidth: 1,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  listContent: {
    paddingBottom: 20,
  },
  catRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
    marginBottom: 8,
    borderWidth: 1,
  },
  actionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  iconButton: {
    padding: 8,
    borderRadius: 8,
  },
  editRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editInput: {
    flex: 1,
    height: 38,
    borderWidth: 1.5,
    paddingHorizontal: 10,
    fontSize: 14,
  },
  actionBtn: {
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    borderTopWidth: 1,
  },
});
