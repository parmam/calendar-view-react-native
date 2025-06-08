# React Native Calendar Component

A customizable, feature-rich calendar component for React Native applications, built from scratch using only React Native's core functionality along with gesture handling from `react-native-gesture-handler` and animations from `react-native-reanimated`.

## Features

- Multiple calendar views: day, 3-day, week, and month
- Event management with drag and drop support
- Resize events by dragging handles
- Create new events by dragging on the time grid
- All-day events support
- Time range configuration
- Customizable theme
- RTL language support
- Timezone handling
- Recurring events support
- Internationalization

## Installation

```bash
npm install react-native-gesture-handler react-native-reanimated
```

Then import the `Calendar` component from the package:

```javascript
import { Calendar } from './src/components/Calendar';
```

## Usage

```jsx
import React, { useState } from 'react';
import { SafeAreaView, View } from 'react-native';
import { Calendar, CalendarEvent } from './src/components/Calendar';

export default function App() {
  const [events, setEvents] = useState([
    {
      id: '1',
      title: 'Meeting with Team',
      start: new Date(2023, 5, 15, 10, 0),
      end: new Date(2023, 5, 15, 11, 30),
      color: '#007AFF',
    },
    {
      id: '2',
      title: 'Lunch Break',
      start: new Date(2023, 5, 15, 12, 0),
      end: new Date(2023, 5, 15, 13, 0),
      color: '#FF9500',
    },
    {
      id: '3',
      title: 'All-Day Event',
      start: new Date(2023, 5, 15, 0, 0),
      end: new Date(2023, 5, 15, 23, 59),
      isAllDay: true,
      color: '#4CD964',
    },
  ]);

  const handleEventCreate = event => {
    setEvents(prevEvents => [...prevEvents, event]);
  };

  const handleEventUpdate = updatedEvent => {
    setEvents(prevEvents =>
      prevEvents.map(event => (event.id === updatedEvent.id ? updatedEvent : event))
    );
  };

  const handleEventDelete = eventId => {
    setEvents(prevEvents => prevEvents.filter(event => event.id !== eventId));
  };

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <View style={{ flex: 1 }}>
        <Calendar
          events={events}
          initialViewType="week"
          initialDate={new Date()}
          timeRange={{ start: 8, end: 20 }} // 8 AM to 8 PM
          onEventCreate={handleEventCreate}
          onEventUpdate={handleEventUpdate}
          onEventDelete={handleEventDelete}
        />
      </View>
    </SafeAreaView>
  );
}
```

## Props

| Prop            | Type                                 | Default               | Description                                          |
| --------------- | ------------------------------------ | --------------------- | ---------------------------------------------------- |
| events          | CalendarEvent[]                      | []                    | Array of events to display in the calendar           |
| initialViewType | 'day' \| '3day' \| 'week' \| 'month' | 'week'                | Initial calendar view                                |
| initialDate     | Date                                 | new Date()            | Initial selected date                                |
| timeRange       | { start: number, end: number }       | { start: 8, end: 20 } | Time range to display (in 24-hour format)            |
| theme           | CalendarTheme                        | defaultTheme          | Theme object for styling the calendar                |
| locale          | string                               | 'en-US'               | Locale for date and time formatting                  |
| firstDayOfWeek  | number                               | 0                     | First day of the week (0 = Sunday, 1 = Monday, etc.) |
| visibleDays     | number[]                             | [0, 1, 2, 3, 4, 5, 6] | Days to show (0 = Sunday, 1 = Monday, etc.)          |
| timeInterval    | number                               | 30                    | Time slot interval in minutes                        |
| onEventPress    | (event: CalendarEvent) => void       | undefined             | Callback when an event is pressed                    |
| onTimeSlotPress | (start: Date, end: Date) => void     | undefined             | Callback when a time slot is pressed                 |
| onEventCreate   | (event: CalendarEvent) => void       | undefined             | Callback when a new event is created                 |
| onEventUpdate   | (event: CalendarEvent) => void       | undefined             | Callback when an event is updated                    |
| onEventDelete   | (eventId: string) => void            | undefined             | Callback when an event is deleted                    |
| onViewChange    | (viewType: CalendarViewType) => void | undefined             | Callback when the view type changes                  |
| onDateChange    | (date: Date) => void                 | undefined             | Callback when the selected date changes              |

## Event Object

```typescript
interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  isAllDay?: boolean;
  color?: string;
  recurrence?: RecurrenceRule;
  metadata?: Record<string, any>;
}
```

## License

MIT
