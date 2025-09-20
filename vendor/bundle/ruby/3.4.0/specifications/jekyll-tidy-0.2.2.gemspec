# -*- encoding: utf-8 -*-
# stub: jekyll-tidy 0.2.2 ruby lib

Gem::Specification.new do |s|
  s.name = "jekyll-tidy".freeze
  s.version = "0.2.2".freeze

  s.required_rubygems_version = Gem::Requirement.new(">= 0".freeze) if s.respond_to? :required_rubygems_version=
  s.require_paths = ["lib".freeze]
  s.authors = ["Wyatt Kirby".freeze]
  s.bindir = "exe".freeze
  s.date = "2017-02-27"
  s.email = ["wyatt@apsis.io".freeze]
  s.homepage = "http://www.apsis.io".freeze
  s.licenses = ["MIT".freeze]
  s.rubygems_version = "2.6.8".freeze
  s.summary = "Sanitize and Tidy HTML Output for Jekyll".freeze

  s.installed_by_version = "3.7.2".freeze

  s.specification_version = 4

  s.add_runtime_dependency(%q<jekyll>.freeze, [">= 0".freeze])
  s.add_runtime_dependency(%q<htmlbeautifier>.freeze, [">= 0".freeze])
  s.add_runtime_dependency(%q<htmlcompressor>.freeze, [">= 0".freeze])
  s.add_development_dependency(%q<bundler>.freeze, ["~> 1.14".freeze])
  s.add_development_dependency(%q<rake>.freeze, ["~> 10.0".freeze])
  s.add_development_dependency(%q<minitest>.freeze, ["~> 5.0".freeze])
end
