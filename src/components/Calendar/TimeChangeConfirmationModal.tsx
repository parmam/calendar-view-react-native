import React from "react";
import { Modal, View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { useCalendar } from "./CalendarContext";
import { formatTime } from "./utils";

const TimeChangeConfirmationModal: React.FC = () => {
  const {
    timeChangeConfirmation,
    hideTimeChangeConfirmation,
    confirmTimeChange,
    theme,
    locale,
  } = useCalendar();

  const { visible, event, newStart, newEnd } = timeChangeConfirmation;

  if (!visible || !event || !newStart || !newEnd) {
    return null;
  }

  // Format times for display
  const oldStartTime = formatTime(event.start, locale);
  const oldEndTime = formatTime(event.end, locale);
  const newStartTime = formatTime(newStart, locale);
  const newEndTime = formatTime(newEnd, locale);

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={hideTimeChangeConfirmation}
    >
      <View style={styles.centeredView}>
        <View
          style={[styles.modalView, { backgroundColor: theme.backgroundColor }]}
        >
          <Text style={[styles.title, { color: theme.textColor }]}>
            Confirmar cambio de horario
          </Text>

          <View style={styles.eventInfo}>
            <Text style={[styles.eventTitle, { color: theme.textColor }]}>
              {event.title}
            </Text>

            <View style={styles.timeRow}>
              <Text style={[styles.timeLabel, { color: theme.textColor }]}>
                Hora actual:
              </Text>
              <Text style={[styles.timeValue, { color: theme.textColor }]}>
                {oldStartTime} - {oldEndTime}
              </Text>
            </View>

            <View style={styles.timeRow}>
              <Text style={[styles.timeLabel, { color: theme.textColor }]}>
                Nueva hora:
              </Text>
              <Text
                style={[
                  styles.timeValue,
                  { color: theme.primaryColor, fontWeight: "bold" },
                ]}
              >
                {newStartTime} - {newEndTime}
              </Text>
            </View>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                { backgroundColor: theme.errorColor },
              ]}
              onPress={hideTimeChangeConfirmation}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                { backgroundColor: theme.successColor },
              ]}
              onPress={confirmTimeChange}
            >
              <Text style={styles.buttonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalView: {
    width: "80%",
    maxWidth: 400,
    borderRadius: 10,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 15,
    textAlign: "center",
  },
  eventInfo: {
    marginBottom: 20,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    textAlign: "center",
  },
  timeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 14,
  },
  timeValue: {
    fontSize: 14,
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  button: {
    borderRadius: 5,
    padding: 10,
    elevation: 2,
    minWidth: "40%",
  },
  cancelButton: {
    marginRight: 10,
  },
  confirmButton: {
    marginLeft: 10,
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },
});

export default TimeChangeConfirmationModal;
