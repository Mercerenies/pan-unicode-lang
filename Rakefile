
$debug = ENV['DEBUG']

task default: %w[compile run]

task :compile do
  files = Dir.glob('src/*.coffee')
  flags = $debug && ['--map']
  sh 'coffee', '--compile', '--output', 'js/', *flags, *files
end

task :run do
  puts "(To be added...)"
end
