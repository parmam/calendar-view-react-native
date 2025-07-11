import React, { useEffect } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useCalendar } from './CalendarContext';
import { formatTime } from './utils';
import { useLogger } from './utils/logger';

// Helper function to format dates in a human-readable way
const formatDate = (date: Date, locale: string): string => {
  const options: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  };
  return date.toLocaleDateString(locale, options);
};

// Check if two dates are on the same day
const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};

const TimeChangeConfirmationModal: React.FC = () => {
  // Add logger
  const logger = useLogger('TimeChangeConfirmationModal');

  const {
    timeChangeConfirmation,
    hideTimeChangeConfirmation,
    confirmTimeChange,
    theme,
    locale,
    viewType,
  } = useCalendar();

  const { visible, event, newStart, newEnd } = timeChangeConfirmation;

  // Add logging when modal appears
  useEffect(() => {
    if (visible && event && newStart && newEnd) {
      logger.debug('Time change confirmation shown', {
        eventId: event.id,
        eventTitle: event.title,
        oldStart: event.start.toLocaleTimeString(),
        oldEnd: event.end.toLocaleTimeString(),
        newStart: newStart.toLocaleTimeString(),
        newEnd: newEnd.toLocaleTimeString(),
        oldDate: event.start.toLocaleDateString(),
        newDate: newStart.toLocaleDateString(),
        dayChanged: !isSameDay(event.start, newStart),
        viewType,
      });
    }
  }, [visible, event, newStart, newEnd, viewType]);

  // Handle confirming time change with error catching
  const handleConfirmTimeChange = () => {
    try {
      logger.debug('Confirming time change', {
        eventId: event?.id,
        viewType,
      });
      confirmTimeChange();
    } catch (error: any) {
      logger.error('❌ Error confirming time change', {
        error: error.message,
        eventId: event?.id,
        viewType,
      });
      // Ensure modal is hidden even if there's an error
      hideTimeChangeConfirmation();
    }
  };

  // Handle canceling time change with error catching
  const handleCancelTimeChange = () => {
    try {
      logger.debug('Canceling time change', {
        eventId: event?.id,
        viewType,
      });
      hideTimeChangeConfirmation();
    } catch (error: any) {
      logger.error('❌ Error canceling time change', {
        error: error.message,
        eventId: event?.id,
        viewType,
      });
      // Force hide modal if possible
      try {
        hideTimeChangeConfirmation();
      } catch {
        console.log('Error hiding time change confirmation');
      }
    }
  };

  // Safety check - if any required data is missing, don't render
  if (!visible || !event || !newStart || !newEnd) {
    return null;
  }

  // Format times for display
  const oldStartTime = formatTime(event.start, locale);
  const oldEndTime = formatTime(event.end, locale);
  const newStartTime = formatTime(newStart, locale);
  const newEndTime = formatTime(newEnd, locale);

  // Check if day has changed
  const dayChanged = !isSameDay(event.start, newStart);

  // Format dates if day has changed
  const oldDate = formatDate(event.start, locale);
  const newDate = formatDate(newStart, locale);

  // Set appropriate modal title based on what changed
  const modalTitle = dayChanged
    ? 'Confirmar cambio de día y horario'
    : 'Confirmar cambio de horario';

  return (
    <Modal
      transparent={true}
      visible={visible}
      animationType="fade"
      onRequestClose={handleCancelTimeChange}
    >
      <View style={styles.centeredView}>
        <View style={[styles.modalView, { backgroundColor: theme.backgroundColor }]}>
          <Text style={[styles.title, { color: theme.textColor }]}>{modalTitle}</Text>

          <View style={styles.eventInfo}>
            <Text style={[styles.eventTitle, { color: theme.textColor }]}>{event.title}</Text>

            {dayChanged && (
              <>
                <View style={styles.timeRow}>
                  <Text style={[styles.timeLabel, { color: theme.textColor }]}>Día actual:</Text>
                  <Text style={[styles.timeValue, { color: theme.textColor }]}>{oldDate}</Text>
                </View>
                <View style={styles.timeRow}>
                  <Text style={[styles.timeLabel, { color: theme.textColor }]}>Nuevo día:</Text>
                  <Text
                    style={[styles.timeValue, { color: theme.primaryColor, fontWeight: 'bold' }]}
                  >
                    {newDate}
                  </Text>
                </View>
              </>
            )}

            <View style={styles.timeRow}>
              <Text style={[styles.timeLabel, { color: theme.textColor }]}>Hora actual:</Text>
              <Text style={[styles.timeValue, { color: theme.textColor }]}>
                {oldStartTime} - {oldEndTime}
              </Text>
            </View>

            <View style={styles.timeRow}>
              <Text style={[styles.timeLabel, { color: theme.textColor }]}>Nueva hora:</Text>
              <Text style={[styles.timeValue, { color: theme.primaryColor, fontWeight: 'bold' }]}>
                {newStartTime} - {newEndTime}
              </Text>
            </View>
          </View>

          <View style={styles.buttonsContainer}>
            <TouchableOpacity
              style={[styles.button, styles.cancelButton, { backgroundColor: theme.errorColor }]}
              onPress={handleCancelTimeChange}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.confirmButton, { backgroundColor: theme.successColor }]}
              onPress={handleConfirmTimeChange}
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '80%',
    maxWidth: 400,
    borderRadius: 10,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
  },
  eventInfo: {
    marginBottom: 20,
  },
  eventTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  timeLabel: {
    fontSize: 14,
  },
  timeValue: {
    fontSize: 14,
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  button: {
    borderRadius: 5,
    padding: 10,
    elevation: 2,
    minWidth: '40%',
  },
  cancelButton: {
    marginRight: 10,
  },
  confirmButton: {
    marginLeft: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});

export default TimeChangeConfirmationModal;
