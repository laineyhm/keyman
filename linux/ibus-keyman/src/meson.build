util_files = files(
  'keymanutil.c',
  'keymanutil.h',
  'kmpdetails.c',
  'kmpdetails.h',
)

engine_files = files(
  'main.c',
  'engine.c',
  'engine.h',
  'keycodes.h',
  'keyman-service.c',
  'keyman-service.h',
)

include_dirs = [
  core_include_dirs,
  include_directories('..'),
  include_directories(meson.current_build_dir() / '..'),
]

deps = [ibus, gtk, x11, json_glib, kmnkbp_lib]

prefix = get_option('prefix')
cfg = configuration_data()
cfg.set('VERSION', meson.project_version())
cfg.set('LIBEXECDIR', get_option('prefix') / get_option('libexecdir'))

configure_file(
  configuration: cfg,
  input: 'keyman.xml.in',
  output: 'keyman.xml',
  install: true,
  install_dir: get_option('datadir') / 'ibus/component',
)

configure_file(
  configuration: cfg,
  input: 'keyman-version.h.in',
  output: 'keyman-version.h'
)

exe = executable(
  'ibus-engine-keyman',
  sources: [engine_files, util_files],
  dependencies: deps,
  include_directories: include_dirs,
  install: true,
  install_dir: get_option('libexecdir'),
)

subdir('test')
