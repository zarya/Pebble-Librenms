#include <pebble.h>
  
#define KEY_ALERTCOUNT 0
#define KEY_CONDITIONS 1
  
static Window *s_main_window;
static TextLayer *s_time_layer;
static TextLayer *s_alert_count_layer;
static TextLayer *s_alerts_layer;

//static InverterLayer *s_inverter_layer;

static Layer *window_layer;

static GFont s_time_font;
static GFont s_alert_font;
static GFont s_alerts_font;

static ScrollLayer *s_scroll_layer;

static void update_time() {
  // Get a tm structure
  time_t temp = time(NULL); 
  struct tm *tick_time = localtime(&temp);

  // Create a long-lived buffer
  static char buffer[] = "00:00";

  // Write the current hours and minutes into the buffer
  if(clock_is_24h_style() == true) {
    //Use 2h hour format
    strftime(buffer, sizeof("00:00"), "%H:%M", tick_time);
  } else {
    //Use 12 hour format
    strftime(buffer, sizeof("00:00"), "%I:%M", tick_time);
  }

  // Display this time on the TextLayer
  text_layer_set_text(s_time_layer, buffer);
}

static void main_window_load(Window *window) {
  window_layer = window_get_root_layer(window);

  //Fonts
  s_time_font = fonts_load_custom_font(resource_get_handle(RESOURCE_ID_FONT_PERFECT_DOS_20));
  s_alerts_font = fonts_load_custom_font(FONT_KEY_GOTHIC_14);

  // Create time TextLayer
  s_time_layer = text_layer_create(GRect(0, 0, 144, 25));
  text_layer_set_background_color(s_time_layer, GColorBlack);
  text_layer_set_text_color(s_time_layer, GColorWhite);
  text_layer_set_text(s_time_layer, "00:00");
  text_layer_set_font(s_time_layer, s_time_font);
  text_layer_set_text_alignment(s_time_layer, GTextAlignmentCenter);
  layer_add_child(window_layer, text_layer_get_layer(s_time_layer));
  
  // Create Alert count Layer
  s_alert_count_layer = text_layer_create(GRect(0, 25, 144, 200));
  text_layer_set_background_color(s_alert_count_layer, GColorBlack);
  text_layer_set_text_color(s_alert_count_layer, GColorWhite);
  text_layer_set_text_alignment(s_alert_count_layer, GTextAlignmentLeft);
  text_layer_set_overflow_mode(s_alert_count_layer, GTextOverflowModeFill);
  text_layer_set_text(s_alert_count_layer, "Loading...");
  text_layer_set_font(s_alert_count_layer, s_time_font);
  layer_add_child(window_layer, text_layer_get_layer(s_alert_count_layer));
  
  // Create Alerts scroller
  s_scroll_layer = scroll_layer_create(GRect(0, 50, 145, 168-50));
  scroll_layer_set_click_config_onto_window(s_scroll_layer, window);
  
  // Create Alerts Layer
  s_alerts_layer = text_layer_create(GRect(0, 0, 145, 2000));
  //text_layer_set_background_color(s_alerts_layer, GColorBlack);
  //text_layer_set_text_color(s_alerts_layer, GColorWhite);
  //text_layer_set_overflow_mode(s_alerts_layer, GTextOverflowModeFill);
  //text_layer_set_text_alignment(s_alerts_layer, GTextAlignmentLeft);
  text_layer_set_font(s_alerts_layer, s_alerts_font);
  
  scroll_layer_add_child(s_scroll_layer, text_layer_get_layer(s_alerts_layer));
  layer_add_child(window_layer, scroll_layer_get_layer(s_scroll_layer));

  // Make sure the time is displayed from the start
  update_time();
}

static void main_window_unload(Window *window) {
  fonts_unload_custom_font(s_time_font);
  fonts_unload_custom_font(s_alerts_font);
  text_layer_destroy(s_time_layer);
  text_layer_destroy(s_alerts_layer);
  text_layer_destroy(s_alert_count_layer);
  fonts_unload_custom_font(s_alert_font);
  scroll_layer_destroy(s_scroll_layer);
}

static void tick_handler(struct tm *tick_time, TimeUnits units_changed) {
  update_time();

  if(tick_time->tm_min % 30 == 0) {
    DictionaryIterator *iter;
    app_message_outbox_begin(&iter);
    dict_write_uint8(iter, 0, 0);
    app_message_outbox_send();
  }
}

static void inbox_received_callback(DictionaryIterator *iterator, void *context) {
  // Store incoming information
  static char temperature_buffer[25];
  static char conditions_buffer[1024];
  
  // Read first item
  Tuple *t = dict_read_first(iterator);

  // For all items
  while(t != NULL) {
    // Which key was received?
    switch(t->key) {
    case KEY_ALERTCOUNT:
      snprintf(temperature_buffer, sizeof(temperature_buffer), "Alerts: %d", (int)t->value->int32);
      break;
    case KEY_CONDITIONS:
      //snprintf(conditions_buffer, strlen(t->value->cstring) + 1, "%s", t->value->cstring);
      memcpy(conditions_buffer, t->value->cstring, strlen(t->value->cstring) + 1);
      break;
    default:
      APP_LOG(APP_LOG_LEVEL_ERROR, "Key %d not recognized!", (int)t->key);
      break;
    }

    // Look for next item
    t = dict_read_next(iterator);
  }
  
  // Assemble full string and display
  text_layer_set_text(s_alert_count_layer, temperature_buffer);
  text_layer_set_text(s_alerts_layer, conditions_buffer);
  
  GSize max_size = text_layer_get_content_size(s_alerts_layer);
  max_size.w = 144;
  if (max_size.h < (168 - 50)) {
    max_size.h = (168 - 50);
  } else {
    max_size.h += 20;
  }
  APP_LOG(APP_LOG_LEVEL_INFO, "Max size %d", (int)max_size.h);
  text_layer_set_size(s_alerts_layer, max_size); // resize layer
  scroll_layer_set_content_size(s_scroll_layer, GSize(max_size.w, max_size.h)); // resize scroll layer
}

static void inbox_dropped_callback(AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_ERROR, "Message dropped!");
}

static void outbox_failed_callback(DictionaryIterator *iterator, AppMessageResult reason, void *context) {
  APP_LOG(APP_LOG_LEVEL_ERROR, "Outbox send failed!");
}

static void outbox_sent_callback(DictionaryIterator *iterator, void *context) {
  APP_LOG(APP_LOG_LEVEL_INFO, "Outbox send success!");
}
  
static void init() {
  // Create main Window element and assign to pointer
  s_main_window = window_create();

  // Set handlers to manage the elements inside the Window
  window_set_window_handlers(s_main_window, (WindowHandlers) {
    .load = main_window_load,
    .unload = main_window_unload
  });

  // Show the Window on the watch, with animated=true
  window_stack_push(s_main_window, true);
  
  // Register with TickTimerService
  tick_timer_service_subscribe(MINUTE_UNIT, tick_handler);
  
  // Register callbacks
  app_message_register_inbox_received(inbox_received_callback);
  app_message_register_inbox_dropped(inbox_dropped_callback);
  app_message_register_outbox_failed(outbox_failed_callback);
  app_message_register_outbox_sent(outbox_sent_callback);
  
  // Open AppMessage
  app_message_open(app_message_inbox_size_maximum(), app_message_outbox_size_maximum());
}

static void deinit() {
  // Destroy Window
  window_destroy(s_main_window);
}

int main(void) {
  init();
  app_event_loop();
  deinit();
}
