test_files = [
  'ibusimcontext.c',
  'ibusimcontext.h',
  'testfixture.cpp',
  'testmodule.c',
  'testmodule.h',
]

kmx_dir = [
  core_dir / 'build/arch' / get_option('buildtype') / 'tests/kmx_test_source'
]

kmnkbp_tests_lib = cc.find_library(
  'libkmnkbp-tests',
  dirs: kmx_dir
)

deps = [ibus, gtk, x11, json_glib, kmnkbp_lib, kmnkbp_tests_lib]

test_env = [
  'G_TEST_SRCDIR=' + meson.current_source_dir(),
  'G_TEST_BUILDDIR=' + meson.current_build_dir(),
]

test_include_dirs = [
  core_include_dirs,
  include_directories('../../../core/tests/kmx_test_source'),
  include_directories('../src'),
  include_directories('..'),
]

test_exe = executable(
  'ibus-keyman-tests',
  test_files, util_files,
  dependencies: deps,
  include_directories: test_include_dirs,
)

env_file = '/tmp/env.txt'
pid_file = '/tmp/ibus-keyman-test-pids'

setup_tests = find_program('setup-tests.sh', dirs: [meson.current_source_dir() / 'scripts'])
teardown_tests = find_program('teardown-tests.sh', dirs: [meson.current_source_dir() / 'scripts'])
run_test = find_program('run-single-test.sh', dirs: [meson.current_source_dir() / 'scripts'])
find_tests = find_program('find-tests.sh', dirs: [meson.current_source_dir() / 'scripts'])

test(
  'setup-x11',
  setup_tests,
  args: ['--x11', env_file, pid_file],
  env: test_env,
  priority: -10,
  is_parallel: false,
  protocol: 'exitcode'
)

test(
  'setup-wayland',
  setup_tests,
  args: ['--wayland', env_file, pid_file],
  env: test_env,
  priority: -20,
  is_parallel: false,
  protocol: 'exitcode'
)

test(
  'teardown-x11',
  teardown_tests,
  args: [pid_file],
  priority: -19,
  is_parallel: false,
  protocol: 'exitcode'
)

test(
  'teardown-wayland',
  teardown_tests,
  args: [pid_file],
  priority: -29,
  is_parallel: false,
  protocol: 'exitcode'
)

kmxtest_files = run_command(
  find_tests,
  kmx_dir,
  check: true,
).stdout().split('\n')

foreach kmx: kmxtest_files
  filename = kmx.split('\t')
  if filename[0] == ''
    continue
  endif
  testname = filename[1].split('.kmx')[0]
  test_args = [ '--tap', '-k', '--env', env_file, '--', filename]
  test(
    'X11-' + testname + '__surrounding-text',
    run_test,
    args: [ '--x11', '--surrounding-text', test_args],
    env: test_env,
    depends: [test_exe],
    priority: -11,
    is_parallel: false,
    timeout: 120,
    protocol: 'tap',
  )
  test(
    'X11-' + testname + '__no-surrounding-text',
    run_test,
    args: [ '--x11', '--no-surrounding-text', test_args],
    env: test_env,
    depends: [test_exe],
    priority: -12,
    is_parallel: false,
    timeout: 120,
    protocol: 'tap',
  )
  test(
    'Wayland-' + testname + '__surrounding-text',
    run_test,
    args: [ '--wayland', '--surrounding-text', test_args],
    env: test_env,
    depends: [test_exe],
    priority: -21,
    is_parallel: false,
    timeout: 120,
    protocol: 'tap',
  )
  test(
    'Wayland-' + testname + '__no-surrounding-text',
    run_test,
    args: [ '--wayland', '--no-surrounding-text', test_args],
    env: test_env,
    depends: [test_exe],
    priority: -22,
    is_parallel: false,
    timeout: 120,
    protocol: 'tap',
  )
endforeach
