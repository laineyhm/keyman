#include <algorithm>
#include <cctype>
#include <fstream>
#include <iostream>
#include <iomanip>
#include <iterator>
#include <list>
#include <sstream>
#include <string>
#include <type_traits>
#include <codecvt>

#if 0
// TODO-LDML If we need to avoid exceptions in JSON
#define JSON_TRY_USER if(true)
#define JSON_CATCH_USER(exception) if(false)
#define JSON_THROW_USER(exception) { return __LINE__; } // get out
#endif

#include <json.hpp>

#include <kmx/kmx_processevent.h> // for char to vk mapping tables
#include <kmx/kmx_xstring.h> // for surrogate pair macros
#include <kmx/kmx_plus.h>
#include "ldml/keyboardprocessor_ldml.h"
#include "ldml/ldml_processor.hpp"


#include "path.hpp"
#include "state.hpp"
#include "utfcodec.hpp"

#include "ldml_test_source.hpp"

#define assert_or_return(expr) if(!(expr)) { \
  std::wcerr << __FILE__ << ":" << __LINE__ << ": " << \
  console_color::fg(console_color::BRIGHT_RED) \
             << "warning: " << (#expr) \
             << console_color::reset() \
             << std::endl; \
  return __LINE__; \
}

#define TEST_JSON_SUFFIX "-test.json"
namespace km {
namespace tests {

#include "../test_color.h"


LdmlTestSource::LdmlTestSource() {
}


LdmlTestSource::~LdmlTestSource() {

}

km_kbp_status LdmlTestSource::get_expected_load_status() {
  return KM_KBP_STATUS_OK;
}

bool LdmlTestSource::get_expected_beep() const {
  return false;
}

// String trim functions from https://stackoverflow.com/a/217605/1836776
// trim from start (in place)
static inline void
ltrim(std::string &s) {
  s.erase(s.begin(), std::find_if(s.begin(), s.end(), [](int ch) { return !std::isspace(ch); }));
}

// trim from end (in place)
static inline void
rtrim(std::string &s) {
  s.erase(std::find_if(s.rbegin(), s.rend(), [](int ch) { return !std::isspace(ch); }).base(), s.end());
}

// trim from both ends (in place)
static inline void
trim(std::string &s) {
  ltrim(s);
  rtrim(s);
}

LdmlEmbeddedTestSource::LdmlEmbeddedTestSource() {

}

LdmlEmbeddedTestSource::~LdmlEmbeddedTestSource() {

}

std::u16string
LdmlTestSource::parse_source_string(std::string const &s) {
  std::u16string t;
  for (auto p = s.begin(); p != s.end(); p++) {
    if (*p == '\\') {
      p++;
      km_kbp_usv v;
      assert(p != s.end());
      if (*p == 'u' || *p == 'U') {
        // Unicode value
        p++;
        size_t n;
        std::string s1 = s.substr(p - s.begin(), 8);
        v              = std::stoul(s1, &n, 16);
        // Allow deadkey_number (U+0001) characters and onward
        assert(v >= 0x0001 && v <= 0x10FFFF);
        p += n - 1;
        if (v < 0x10000) {
          t += km_kbp_cp(v);
        } else {
          t += km_kbp_cp(Uni_UTF32ToSurrogate1(v));
          t += km_kbp_cp(Uni_UTF32ToSurrogate2(v));
        }
      } else if (*p == 'd') {
        // Deadkey
        // TODO, not yet supported
        assert(false);
      }
    } else {
      t += *p;
    }
  }
  return t;
}

std::u16string
LdmlTestSource::parse_u8_source_string(std::string const &u8s) {
  // convert from utf-8 to utf-16 first
  std::u16string s = std::wstring_convert<std::codecvt_utf8_utf16<char16_t>, char16_t>{}.from_bytes(u8s);
  std::u16string t;
  for (auto p = s.begin(); p != s.end(); p++) {
    if (*p == '\\') {
      p++;
      km_kbp_usv v;
      assert(p != s.end());
      if (*p == 'u' || *p == 'U') {
        // Unicode value
        p++;
        size_t n;
        std::u16string s1 = s.substr(p - s.begin(), 8);
        // TODO-LDML: convert back first?
        std::string s1b = std::wstring_convert<std::codecvt_utf8_utf16<char16_t>, char16_t>{}.to_bytes(s1);
        v              = std::stoul(s1b, &n, 16);
        // Allow deadkey_number (U+0001) characters and onward
        assert(v >= 0x0001 && v <= 0x10FFFF);
        p += n - 1;
        if (v < 0x10000) {
          t += km_kbp_cp(v);
        } else {
          t += km_kbp_cp(Uni_UTF32ToSurrogate1(v));
          t += km_kbp_cp(Uni_UTF32ToSurrogate2(v));
        }
      } else if (*p == 'd') {
        // Deadkey
        // TODO, not yet supported
        assert(false);
      }
    } else {
      t += *p;
    }
  }
  return t;
}

bool
LdmlEmbeddedTestSource::is_token(const std::string token, std::string &line) {
  if (line.compare(0, token.length(), token) == 0) {
    line = line.substr(token.length());
    trim(line);
    return true;
  }
  return false;
}

int
LdmlEmbeddedTestSource::load_source( const km::kbp::path &path ) {
  const std::string s_keys = "@@keys: ";
  const std::string s_expected = "@@expected: ";
  const std::string s_context = "@@context: ";
  const std::string s_capsLock = "@@capsLock: ";
  const std::string s_expecterror = "@@expect-error: ";

  // Parse out the header statements in file.kmn that tell us (a) environment, (b) key sequence, (c) start context, (d) expected
  // result
  std::ifstream kmn(path.native());
  if (!kmn.good()) {
    std::cerr << "could not open file: " << path << std::endl;
    return __LINE__;
  }
  std::string line;
  while (std::getline(kmn, line)) {
    trim(line);

    if (!line.length())
      continue;
    if (line.compare(0, s_keys.length(), s_keys) == 0) {
      keys = line.substr(s_keys.length());
      trim(keys);
    } else if (is_token(s_expected, line)) {
      if (line == "\\b") {
        expected_beep = true;
      } else {
        expected = parse_source_string(line);
      }
    } else if (is_token(s_expecterror, line)) {
      expected_error = true;
    } else if (is_token(s_context, line)) {
      context = parse_source_string(line);
    } else if (is_token(s_capsLock, line)) {
      set_caps_lock_on(parse_source_string(line).compare(u"1") == 0);
    }
  }

  if (keys == "") {
    // We must at least have a key sequence to run the test
    return __LINE__;
  }

  return 0;
}

km_kbp_status
LdmlEmbeddedTestSource::get_expected_load_status() {
  return expected_error ? KM_KBP_STATUS_INVALID_KEYBOARD : KM_KBP_STATUS_OK;
}

const std::u16string&
LdmlEmbeddedTestSource::get_context() const {
  return context;
}

bool LdmlEmbeddedTestSource::get_expected_beep() const {
  return expected_beep;
}

int
LdmlTestSource::caps_lock_state() {
  return _caps_lock_on ? KM_KBP_MODIFIER_CAPS : 0;
}

void
LdmlTestSource::toggle_caps_lock_state() {
  _caps_lock_on = !_caps_lock_on;
}

void
LdmlTestSource::set_caps_lock_on(bool caps_lock_on) {
  _caps_lock_on = caps_lock_on;
}

key_event
LdmlTestSource::char_to_event(char ch) {
  assert(ch >= 32);
  return {
      km::kbp::kmx::s_char_to_vkey[(int)ch - 32].vk,
      (uint16_t)(km::kbp::kmx::s_char_to_vkey[(int)ch - 32].shifted ? KM_KBP_MODIFIER_SHIFT : 0)};
}

uint16_t
LdmlTestSource::get_modifier(std::string const m) {
  for (int i = 0; km::kbp::kmx::s_modifier_names[i].name; i++) {
    if (m == km::kbp::kmx::s_modifier_names[i].name) {
      return km::kbp::kmx::s_modifier_names[i].modifier;
    }
  }
  return 0;
}

km_kbp_virtual_key
LdmlTestSource::get_vk(std::string const &vk) {
  for (int i = 1; i < 256; i++) {
    if (vk == km::kbp::kmx::s_key_names[i]) {
      return i;
    }
  }
  return 0;
}

key_event
LdmlEmbeddedTestSource::vkey_to_event(std::string const &vk_event) {
  // vkey format is MODIFIER MODIFIER K_NAME
  // std::cout << "VK=" << vk_event << std::endl;

  std::stringstream f(vk_event);
  std::string s;
  uint16_t modifier_state = 0;
  km_kbp_virtual_key vk   = 0;
  while (std::getline(f, s, ' ')) {
    uint16_t modifier = get_modifier(s);
    if (modifier != 0) {
      modifier_state |= modifier;
    } else {
      vk = get_vk(s);
      break;
    }
  }

  // The string should be empty at this point
  assert(!std::getline(f, s, ' '));
  assert(vk != 0);

  return {vk, modifier_state};
}

void
LdmlEmbeddedTestSource::next_action(ldml_action &fillin) {
  if (is_done) {
    // We were already done. return done.
    fillin.type = LDML_ACTION_DONE;
    return;
  } else if(keys.empty()) {
    // Got to the end of the keys. time to check
    fillin.type = LDML_ACTION_CHECK_EXPECTED;
    fillin.string = expected; // copy expected
    is_done = true; // so we get DONE next time
  } else {
    fillin.type = LDML_ACTION_KEY_EVENT;
    fillin.k = next_key();
  }
}


key_event
LdmlEmbeddedTestSource::next_key() {
  // mutate this->keys
  return next_key(keys);
}

key_event
LdmlEmbeddedTestSource::next_key(std::string &keys) {
  // Parse the next element of the string, chop it off, and return it
  // mutates keys
  if (keys.length() == 0)
    return {0, 0};
  char ch = keys[0];
  if (ch == '[') {
    if (keys.length() > 1 && keys[1] == '[') {
      keys.erase(0, 2);
      return char_to_event(ch);
    }
    auto n = keys.find(']');
    assert(n != std::string::npos);
    auto vkey = keys.substr(1, n - 1);
    keys.erase(0, n + 1);
    return vkey_to_event(vkey);
  } else {
    keys.erase(0, 1);
    return char_to_event(ch);
  }
}


class LdmlJsonTestSource : public LdmlTestSource {
public:
  LdmlJsonTestSource(const std::string &path, km::kbp::kmx::kmx_plus *kmxplus);
  virtual ~LdmlJsonTestSource();
  virtual const std::u16string &get_context() const;
  int load(const nlohmann::json &test);
  virtual void next_action(ldml_action &fillin);
private:
  std::string path;
  nlohmann::json data;  // maybe
  std::u16string context;
  std::u16string expected;
  /**
   * Which action are we on?
  */
  std::size_t action_index = -1;
  const km::kbp::kmx::kmx_plus *kmxplus;
  /**
   * Helpers
  */
  void set_key_from_id(key_event& k, const std::u16string& id);
};

LdmlJsonTestSource::LdmlJsonTestSource(const std::string &path, km::kbp::kmx::kmx_plus *k)
:path(path), kmxplus(k) {

}

LdmlJsonTestSource::~LdmlJsonTestSource() {
}

void LdmlJsonTestSource::set_key_from_id(key_event& k, const std::u16string& id) {
  k = {0, 0};  // set to a null value at first.

  assert(kmxplus != nullptr);
  // lookup the id
  assert(kmxplus->key2 != nullptr);

  assert(kmxplus->key2Helper.valid());

  // TODO-LDML: optimize. or optimise.

  // First, find the string
  KMX_DWORD strId = kmxplus->strs->find(id);
  assert(strId != 0);
  if (strId == 0) { // will also get here if id is empty.
    return;
  }

  // OK. Now we can search the keybag
  KMX_DWORD keyIndex = 0;
  auto *key2 = kmxplus->key2Helper.findKeyByStringId(strId, keyIndex);
  assert(key2 != nullptr);
  if (key2 == nullptr) {
    return;
  }

  // Now, look for the _first_ candidate vkey match in the kmap.
  for (KMX_DWORD kmapIndex = 0; kmapIndex < kmxplus->key2->kmapCount; kmapIndex++) {
    auto *kmap = kmxplus->key2Helper.getKmap(kmapIndex);
    assert(kmap != nullptr);
    if (kmap->key == keyIndex) {
      k = {(km_kbp_virtual_key)kmap->vkey, (uint16_t)kmap->mod};
      return;
    }
  }
  // Else, unfound
  return;
}


void
LdmlJsonTestSource::next_action(ldml_action &fillin) {
  if ((action_index+1) >= data["/actions"_json_pointer].size()) {
    // at end, done
    fillin.type = LDML_ACTION_DONE;
    return;
  }

  action_index++;
  auto action   = data["/actions"_json_pointer].at(action_index);

  // is it a check event?
  auto as_check = action["/check/result"_json_pointer];
  if (as_check.is_string()) {
    fillin.type   = LDML_ACTION_CHECK_EXPECTED;
    fillin.string = LdmlTestSource::parse_u8_source_string(as_check.get<std::string>());
    return;
  }

  // is it a keystroke by id?
  auto as_key  = action["/keystroke/key"_json_pointer];
  if (as_key.is_string()) {
    fillin.type   = LDML_ACTION_KEY_EVENT;
    auto keyId = LdmlTestSource::parse_u8_source_string(as_key.get<std::string>());
    // now, look up the key
    set_key_from_id(fillin.k, keyId);
    return;
  }
  // TODO-LDML: handle gesture, etc

  auto as_emit = action["/emit/to"_json_pointer];
  if (as_emit.is_string()) {
    fillin.type   = LDML_ACTION_EMIT_STRING;
    fillin.string = LdmlTestSource::parse_u8_source_string(as_emit.get<std::string>());
    return;
  }

  // TODO-LDML: error passthrough
  std::cerr << "TODO-LDML: Error, unknown/unhandled action: " << action << std::endl;
  fillin.type = LDML_ACTION_DONE;
}

const std::u16string &
LdmlJsonTestSource::get_context() const {
  return context;
}

int LdmlJsonTestSource::load(const nlohmann::json &data) {
  this->data        = data;  // TODO-LDML
  auto startContext = data["/startContext/to"_json_pointer];
  context = LdmlTestSource::parse_u8_source_string(startContext);

  return 0;
}

LdmlJsonTestSourceFactory::LdmlJsonTestSourceFactory() : test_map() {
}

km::kbp::path
LdmlJsonTestSourceFactory::kmx_to_test_json(const km::kbp::path &kmx) {
  km::kbp::path p = kmx;
  p.replace_extension(TEST_JSON_SUFFIX);
  return p;
}

int LdmlJsonTestSourceFactory::load(const km::kbp::path &compiled, const km::kbp::path &path) {
  std::ifstream json_file(path.native());
  if (!json_file) {
    return -1; // no file
  }
  nlohmann::json data = nlohmann::json::parse(json_file);
  if (data.empty()) {
    return __LINE__; // empty
  }

  // check and load the KMX (yes, once again)
  if(!km::kbp::ldml_processor::is_kmxplus_file(compiled, rawdata)) {
    std::cerr << "Reading KMX for test purposes failed: " << compiled << std::endl;
    return __LINE__;
  }

  auto comp_keyboard = (const km::kbp::kmx::COMP_KEYBOARD*)rawdata.data();
  // initialize the kmxplus object with our copy
  kmxplus.reset(new km::kbp::kmx::kmx_plus(comp_keyboard, rawdata.size()));

  if (!kmxplus->is_valid()) {
    std::cerr << "kmx_plus invalid" << std::endl;
    return __LINE__;
  }

  if (!kmxplus->key2Helper.valid()) {
    std::cerr << "kmx_plus invalid" << std::endl;
    return __LINE__;
  }

  auto conformsTo = data["/keyboardTest/conformsTo"_json_pointer].get<std::string>();
  assert_or_return(std::string(LDML_CLDR_VERSION_LATEST) == conformsTo);
  auto info_keyboard = data["/keyboardTest/info/keyboard"_json_pointer].get<std::string>();
  auto info_author = data["/keyboardTest/info/author"_json_pointer].get<std::string>();
  auto info_name = data["/keyboardTest/info/name"_json_pointer].get<std::string>();
  // TODO-LDML: store these elsewhere?
  std::cout << "JSON: reading " << info_name << " test of " << info_keyboard << " by " << info_author << std::endl;

  // TODO-LDML: repertoire test #8435

  auto all_tests = data["/keyboardTest/tests"_json_pointer];
  assert_or_return((!all_tests.empty()) && (all_tests.size() > 0));

  for(auto tests : all_tests) {
    auto tests_name = tests["/name"_json_pointer].get<std::string>();
    for (auto test : tests["/test"_json_pointer]) {
      auto test_name = test["/name"_json_pointer].get<std::string>();
      std::string test_path;
      test_path.append(tests_name).append("/").append(test_name);
      std::cout << "JSON: reading " << info_name << "/" << test_path << std::endl;

      std::unique_ptr<LdmlJsonTestSource> subtest(new LdmlJsonTestSource(test_path, kmxplus.get()));
      assert_or_return(subtest->load(test) == 0);
      test_map[test_path] = std::unique_ptr<LdmlTestSource>(subtest.release());
    }
  }

  return 0;
}

const JsonTestMap&
LdmlJsonTestSourceFactory::get_tests() const {
  return test_map;
}


}  // namespace tests
}  // namespace km
