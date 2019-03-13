+++
description = "Interactor"
title ="Interactor"
date = 2019-03-13T10:44:53-07:00
draft = false
toc = true
weight = 20
bref = ""
+++

{{< highlight javasript >}}
class MyTask extends Interactor {

  call() {
    fetch(`/user/${this.context.userId`).then((user) => {
      this.context.user = user;
      this.resolve();
    }).catch(this.reject);
  }
}
{{< / highlight >}}


