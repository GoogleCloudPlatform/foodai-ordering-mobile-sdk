# Copyright 2026 Google LLC
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#     http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))
foodai_ios_sdk_version = ENV["FOODAI_IOS_SDK_VERSION"] || "0.7.0"

Pod::Spec.new do |s|
  s.name         = "FoodaiOrderingReactNative"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = package["homepage"]
  s.license      = package["license"]
  s.authors      = package["author"]

  s.platforms    = { :ios => respond_to?(:min_ios_version_supported, true) ? min_ios_version_supported : "15.1" }
  s.source       = { :git => "https://github.com/GoogleCloudPlatform/foodai-ordering-mobile-sdk.git", :tag => "v#{s.version}" }

  s.source_files = "ios/*.{h,m,mm,swift}"
  # Keep ObjC++ headers (which import C++ codegen/RN headers) out of the pod's public
  # Clang module umbrella; otherwise Swift/ObjC module scanning fails on C++ std headers.
  s.private_header_files = "ios/*.h"
  s.swift_version = "5.9"

  s.test_spec "Tests" do |test_spec|
    test_spec.source_files = "ios/Tests/**/*.swift"
  end

  # Download and unpack foodai_orderingagent.xcframework when missing or when the
  # cached version differs from foodai_ios_sdk_version.
  s.prepare_command = <<-CMD
    sh ./scripts/fetch-ios-sdk.sh "#{foodai_ios_sdk_version}"
  CMD

  s.vendored_frameworks = "ios/Frameworks/foodai_orderingagent.xcframework"

  install_modules_dependencies(s)

  existing_xcconfig = s.attributes_hash["pod_target_xcconfig"] || s.attributes_hash[:pod_target_xcconfig] || {}
  s.pod_target_xcconfig = existing_xcconfig.merge({
    "DEFINES_MODULE" => "YES",
    "SWIFT_COMPILATION_MODE" => "wholemodule"
  })
end
